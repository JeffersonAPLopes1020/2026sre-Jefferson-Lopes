# ATAM — Architecture Tradeoff Analysis Method
## Pipeline ETL Olist (Docker Compose Local)

**Data:** 14/05/2026
**Versão:** 1.0
**Base:** `docker-compose.yml` com Postgres 14, Prometheus, Grafana 10.4.2, Pipeline Python 3.11

---

## 1. Tabela ATAM (7 Colunas)

| QA | Scenario | Architectural Decisions | Sensitivity Points | Tradeoffs | Risks | Non-risks |
|----|----------|------------------------|--------------------|-----------|-------|-----------|
| **Availability** | Pipeline sobrevive ao crash do Postgres por até 30s; Grafana responde com último dado em cache | Pipeline com `depends_on: condition: service_healthy`; Grafana com cache de datasource; checkpoint via tabela Postgres | TTL do cache Grafana; ausência de healthcheck próprio no pipeline; timeout de conexão Postgres (30s default psycopg2) | Cache longo (Avail) vs frescor de dados (Perf) | Pipeline aborta se conexão excede 30s sem retry lógico; sem dead-letter queue; sem retomada automática | Crash do Pipeline não corrompe Postgres (transações ACID) |
| **Performance / Latência** | Query dashboard carrega em < 3s p95 sob 1 usuário simultâneo | Postgres com índices por `order_id` e `order_purchase_timestamp`; Grafana sem materialized views | Index design; volume de dados na tabela `olist_orders` (100k/dia); concorrência de queries | Índices (Perf) vs velocidade de INSERT (Throughput) | Latência degrada linearmente com acúmulo mensal (~3M linhas em 30 dias); sem particionamento por data | Dataset ~100k/dia cabe em RAM — sem necessidade de sharding |
| **Performance / Throughput** | Pipeline processa 100k registros em < 2h em t2.micro | Batch de 1000 registros; pandas em memória; sem paralelismo; `pool_size: 10` no Postgres | Tamanho do batch; pool_size; memória RAM do container; overhead de checkpoint a cada batch | Batch maior (Throughput) vs RAM (Avail) | Sem backpressure; pipeline pode consumir toda memória em CSV muito grande; sem streaming | Batch de 1000 foi dimensionado para 2h de SLA; cabe em 512MB RAM |
| **Modifiability** | Trocar schema de origem sem reescrever Grafana | Schema-on-write no Postgres (`INSERT ... ON CONFLICT`); views Grafana consomem tabela `olist_orders` | Estrutura da tabela; formato do CSV de origem; código do pipeline | Schema rígido (Consistência) vs flexibilidade (Modif) | Pipeline assume colunas fixas do CSV; mudança de schema requer migração; sem schema registry | Tabela com `source_file` e `batch_id` permite rastrear origem |
| **Security** | Credenciais não vazam para logs nem para o dashboard | `olist_password` em docker-compose.yml; Grafana com `secureJsonData`; rede interna `olist_network` isola portas | Senha hardcoded no compose; nível de log; usuário `olist` tem privilégio total (DDL + DML) | Log detalhado (Debugability) vs vazamento de credencial (Security) | Senha commitada no docker-compose.yml; sem usuário read-only para Grafana; sem rotação | Rede bridge interna isola portas (só 3000, 9090, 5432 expostos) |
| **Deployability** | Subir stack em nova máquina em < 30min sem perda | Docker Compose com volumes nomeados; `.env.example`; comando único `docker compose up -d` | Imagem `prom/prometheus:latest`; volumes nomeados; ausência de lockfile de imagem | Tag `latest` (Deploy fácil) vs reprodutibilidade (Modif) | Imagem `latest` pode quebrar entre builds; sem healthcheck no pipeline container | Compose roda em Linux/macOS/Windows — testado |
| **Cost** | Custo previsível — não sobrecarregar o laptop | Sem `mem_limit`/`cpus` no Compose; volumes locais sem quota; execução single-threaded | Falta de limites de recurso; acúmulo de ~3M linhas/mês | Append-only (Audit) vs uso de disco (Cost) | Disco enche em demos longas; sem TTL em dados antigos; sem `VACUUM` periódico | Custo local é zero; na AWS será limitado por free tier |

---

## 2. Sensitivity Points Consolidados

### SP-01 · Healthcheck do Pipeline
- Postgres tem healthcheck completo, mas **o container pipeline não tem healthcheck próprio**
- `depends_on` só espera Postgres, mas não valida se o pipeline está vivo
- Bug: `CMD ["python", "-m", "src.main"]` — módulo `src.main` não existe (é `app.main`)

**Tática Bass:** *Ping/Echo + Heartbeat*
**Local:** `docker-compose.yml` + `pipeline/app/main.py` (endpoint `/health`)

### SP-02 · Pipeline SPOF sem Retry Real
- `retry_max_attempts: 3` configurado no YAML, mas **código é stub** — não há implementação
- Nenhuma chamada a S3, Postgres ou checkpoint usa `tenacity` ou `backoff`
- Sem dead-letter queue; sem retomada automática de checkpoint

**Tática Bass:** *Retry + Exception Handling + Idempotency*
**Local:** `pipeline/app/ingestion/`, `pipeline/app/load/`, `pipeline/app/checkpoint/`

### SP-03 · Ausência de Circuit Breaker no boto3
- boto3 retenta indefinidamente em `SlowDown` e desconexões
- Sem timeout explícito por chamada; sem circuit breaker
- Pipeline pode sobrecarregar S3 em laço

**Tática Bass:** *Circuit Breaker*
**Local:** `pipeline/app/ingestion/` (wrapper boto3)

### SP-04 · Latência de Queries sob Concorrência
- Grafana sem cache configurado além do datasource padrão
- Sem materialized views; sem particionamento temporal
- Acúmulo de ~3M linhas/mês degrada `SELECT` sem `WHERE` por data

**Tática Bass:** *Cache* (reforçado + dashboard caching)
**Local:** Grafana datasource config + pipeline com endpoint `/metrics` para dashboards

### SP-05 · Credenciais Hardcoded
- `olist_password` no docker-compose.yml (versão 3.8)
- Usuário `olist` tem privilégio DDL + DML — Grafana deveria ser read-only
- `.env` com chaves API reais (algumas preenchidas)
- Sem usuário dedicado para Grafana

**Tática Bass:** *Limit Exposure + Authenticate Actors*
**Local:** `docker-compose.yml`, `postgres/init/`, `.env`, `.gitignore`

### SP-06 · Módulos Pipeline são Stubs
- 7 módulos (`ingestion/`, `transformation/`, `load/`, `checkpoint/`, `monitoring/`, `alerting/`, `dashboard/`) são **pastas vazias com `__init__.py`**
- `main.py` só carrega config e loga — não executa pipeline
- Nenhuma função de ETL implementada

**Tática Bass:** *Modifiability via modular design* + *Testability*
**Local:** `pipeline/app/*/` — implementar contratos das interfaces

### SP-07 · Sem Testes Automatizados
- RNF-15 exige ≥80% de cobertura em módulos críticos
- `tests/` não existe
- Sem pytest, sem CI, sem Makefile

**Tática Bass:** *Testability*
**Local:** `tests/unit/`, `tests/integration/`

---

## 3. Mapeamento: Sensitivity Points → Táticas Bass

| SP | Tática Bass | Grupo QA | Local | Status |
|----|-------------|----------|-------|--------|
| SP-01 | Ping/Echo + Heartbeat | Availability | `docker-compose.yml` + health endpoint | 🔴 Não implementado |
| SP-02 | Retry + Exception Handling + Idempotency | Availability | `pipeline/app/ingestion/`, `load/`, `checkpoint/` | 🔴 Não implementado |
| SP-03 | Circuit Breaker | Availability + Performance | `pipeline/app/ingestion/s3_client.py` | 🔴 Não implementado |
| SP-04 | Cache (reforçado) | Performance | Grafana datasource + pipeline metrics | 🟡 Parcial (Grafana cache default) |
| SP-05 | Limit Exposure + Authenticate Actors | Security | docker-compose, init SQL, .gitignore | 🟡 Parcial (.gitignore tem .env, mas senha no compose) |
| SP-06 | Modular Design + Testability | Modifiability | `pipeline/app/*/` — implementar módulos | 🔴 Stubs vazios |
| SP-07 | Testability | Testability | `tests/` + pytest + CI | 🔴 Não existe |

**Legenda:** 🟢 Implementado | 🟡 Parcial | 🔴 Não implementado

---

## 4. Riscos Arquiteturais (Priorizados)

| Risco | Impacto | Probabilidade | Severidade | Mitigação |
|-------|---------|---------------|------------|-----------|
| Pipeline aborta sem checkpoint real | Perda de execução inteira | Alta | Alta | Implementar checkpoint service |
| Credenciais commitadas | Exposição de acesso ao banco | Média | Alta | Remover senha do compose, criar usuário read-only |
| `src.main` não existe | Container morre no startup | Alta | Alta | Corrigir CMD no Dockerfile |
| Sem testes | Regressão não detectada | Alta | Média | Criar test suite pytest |
| boto3 sem timeout | Pipeline travado em S3 | Média | Média | Adicionar timeout + breaker |
| 3M linhas sem partição | Latência de queries | Média (em 30d) | Média | Adicionar partitioning por data |
| `latest` tag nas imagens | Quebra entre builds | Baixa | Média | Fixar versões no compose |

---

## 5. Recomendações por Ordem de Prioridade

### Layer 1 — Correções Críticas (Imediatas)
1. Corrigir `CMD` no Dockerfile: `python -m app.main` (ou `src.main` → criar `pipeline/app/src/`)
2. Remover senha hardcoded do `docker-compose.yml` — usar `${POSTGRES_PASSWORD}` do `.env`
3. Criar usuário read-only `dashboard` no Postgres init SQL para Grafana
4. Fixar versões das imagens Docker (remover `:latest`)

### Layer 2 — Resiliência (Prioridade Alta)
5. Implementar `@tenacity.retry` com backoff exponencial nas chamadas S3 e Postgres
6. Implementar `CircuitBreaker` para S3 (stdlib, sem dependências)
7. Implementar checkpoint service real (salvar offset a cada batch)
8. Adicionar healthcheck no container pipeline (endpoint `/health` na porta 8000)

### Layer 3 — Observabilidade e Testes (Média)
9. Criar test suite: `tests/unit/` (mock) + `tests/integration/` (Docker)
10. Adicionar Makefile com targets: `stack-up`, `seed`, `test-unit`, `test-int`, `stack-down`
11. Criar dashboard Grafana com métricas do pipeline (Prometheus)
12. Adicionar GitHub Actions workflow para CI

### Layer 4 — Performance (Futuro)
13. Implementar particionamento temporal no Postgres (`order_purchase_timestamp`)
14. Adicionar cache layer no Grafana (query caching)
15. Otimizar batch_size dinamicamente

---

## 6. Evidências da Revisão

### 6.1 Dockerfile Bug
```dockerfile
CMD ["python", "-m", "src.main"]  # BUG: não existe src/main.py
# Correção: CMD ["python", "-m", "app.main"]
```

### 6.2 Senha Hardcoded
```yaml
# docker-compose.yml — BUG: senha em texto claro
POSTGRES_PASSWORD: olist_password
# Correção: POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

### 6.3 Módulos Stubs
```
pipeline/app/
├── __init__.py
├── main.py                      # Só carrega config
├── config/        __init__.py   # OK
├── ingestion/     __init__.py   # STUB
├── transformation/ __init__.py  # STUB
├── load/          __init__.py   # STUB
├── checkpoint/    __init__.py   # STUB
├── monitoring/    __init__.py   # STUB
├── alerting/      __init__.py   # STUB
└── dashboard/     __init__.py   # STUB
```

### 6.4 Sem Testes
```
tests/               # NÃO EXISTE
pytest               # NÃO INSTALADO
Makefile             # NÃO EXISTE
.github/workflows/   # NÃO EXISTE
```

---

## 7. Como usar esta revisão no QA Command

```bash
# Ver status atual do quality gate
npx aiox-core@latest qa status

# Executar revisão completa (Layer 1 = crítica, Layer 2 = resiliência, Layer 3 = humana)
npx aiox-core@latest qa run --layer=1   # Verificar correções críticas
npx aiox-core@latest qa run --layer=2   # Verificar táticas Bass implementadas
npx aiox-core@latest qa run --layer=3   # Revisão humana focada nesta ATAM
```

Esta tabela ATAM deve ser revisitada após cada sprint para atualizar o status
das táticas implementadas e reavaliar riscos.
