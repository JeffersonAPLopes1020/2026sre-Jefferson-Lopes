# Requisitos Não Funcionais - Pipeline ETL Olist

## Contexto
Baseado em `spec/00_problem.md` (obrigatório) e `documents/01_functional_requirements.md` (opcional), seguindo a skill `elicit_rnf.md` para mapear requisitos não funcionais aos 8 atributos da ISO 25010.

## Entradas Utilizadas
- `spec/00_problem.md`: Stakeholders, fluxos críticos, modos de falha, 8 atributos ISO 25010 iniciais
- `documents/01_functional_requirements.md`: Requisitos funcionais, prioridades, critérios de aceite

---

## 1. Estabilidade Funcional (Functional Stability)
Garante que o pipeline processa corretamente todos os pedidos, sem perda/duplicação, dados consistentes com a origem.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-01 | O pipeline deve processar 100% dos pedidos válidos contidos no CSV diário, sem perda ou duplicação | % de pedidos processados com sucesso em relação ao total no CSV | ≥ 99.99% em janela de 30 dias | RF-001, RF-008, RF-009, 5.1 spec/00_problem.md | Must |
| RNF-02 | O pipeline deve garantir que dados carregados no Postgres correspondam exatamente aos dados de origem no CSV | % de registros no Postgres que batem com o CSV | 100% em cada execução | RF-009, 5.1 spec/00_problem.md | Must |

---

## 2. Eficiência de Desempenho (Performance Efficiency)
Garante que o processamento e consultas respeitem SLAs de tempo.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-03 | O processamento diário completo do pipeline (CSV → Postgres) deve concluir dentro da janela de SLA | Tempo total de execução do pipeline (fim - início) em horas | ≤ 2 horas em 95% das execuções (janela 30 dias) | RF-018, 5.2 spec/00_problem.md | Must |
| RNF-04 | Consultas nos dashboards Grafana devem ter tempo de resposta aceitável | Latência p95 de consultas Grafana em segundos | ≤ 3s em 99% das consultas (janela 7 dias) | RF-011, 5.2 spec/00_problem.md | Should |

---

## 3. Compatibilidade (Compatibility)
Garante integração com sistemas padronizados e formatos de entrada.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-05 | O pipeline deve aceitar apenas arquivos CSV que sigam o schema padronizado | % de arquivos CSV submetidos que seguem o schema | 100% de rejeição para arquivos fora do padrão | RF-002, 5.3 spec/00_problem.md | Must |
| RNF-06 | O pipeline deve integrar-se sem erros com Postgres 14+ e Grafana 10+ | % de execuções com integração Postgres/Grafana bem-sucedida | 100% em cada execução | RF-003, RF-011, 5.3 spec/00_problem.md | Must |

---

## 4. Usabilidade (Usability)
Garante experiência intuitiva para usuários e facilidade de debugging.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-07 | Os dashboards Grafana devem ser intuitivos para clientes internos | % de usuários que aprovam a usabilidade em pesquisa trimestral | ≥ 90% de aprovação | RF-011, RF-012, 5.4 spec/00_problem.md | Should |
| RNF-08 | Logs estruturados devem permitir identificação de causa raiz em tempo reduzido | Tempo médio para debugging de erros usando logs (em minutos) | ≤ 15 minutos em 95% dos incidentes | RF-015, 5.4 spec/00_problem.md | Should |

---

## 5. Confiabilidade (Reliability)
Garante resiliência, idempotência, recuperação de falhas e visibilidade de erros.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-09 | O pipeline deve ser idempotente: reexecuções não geram duplicação | % de reexecuções sem registros duplicados no Postgres | 100% em todas as reexecuções | RF-004, 5.5 spec/00_problem.md | Must |
| RNF-10 | O pipeline deve recuperar execuções interrompidas por falhas de infraestrutura em tempo reduzido | Tempo de recuperação de falha (MTTR) em minutos | ≤ 10 minutos em 99% das falhas | RF-005, RF-019, 5.5 spec/00_problem.md | Must |
| RNF-11 | Falhas parciais devem acionar retry automático com sucesso na maioria das tentativas | % de retries de falhas transientes bem-sucedidos | ≥ 95% em janela de 30 dias | RF-006, 5.5 spec/00_problem.md | Must |

---

## 6. Segurança (Security)
Garante acesso controlado, auditoria e conformidade com regulamentações.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-12 | Acesso aos dados e dashboards deve ser restrito a usuários autenticados via SSO Olist | % de tentativas de acesso não autorizado bloqueadas | 100% de bloqueio de acessos inválidos | RF-017, 5.6 spec/00_problem.md | Must |
| RNF-13 | Todos os acessos e modificações devem gerar logs de auditoria imutáveis | % de eventos de auditoria logados | 100% de cobertura, retenção de 1 ano | RF-015, 5.6 spec/00_problem.md | Must |
| RNF-14 | Dados PII devem ser criptografados em trânsito e em repouso | % de dados PII criptografados | 100% em todos os armazenamentos e transferências | 5.6 spec/00_problem.md, LGPD | Must |

---

## 7. Manutenibilidade (Maintainability)
Garante código modular, testável e fácil de evoluir.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-15 | O código do pipeline deve ter cobertura de testes automatizados em módulos críticos | % de cobertura de testes em módulos críticos (ingestão, carga) | ≥ 80% em cada release | RF-022, 5.7 spec/00_problem.md | Should |
| RNF-16 | Tempo para adicionar novo fluxo de processamento deve ser reduzido | Tempo (dias) para implementar novo fluxo por engenheiro familiarizado | ≤ 2 dias em 90% das solicitações | 5.7 spec/00_problem.md | Could |

---

## 8. Portabilidade (Portability)
Garante execução consistente em diferentes ambientes e sistemas operacionais.

| ID | Descrição | SLI (Indicador) | SLO (Objetivo) | Fonte | Prioridade |
|----|-----------|-----------------|----------------|-------|------------|
| RNF-17 | O pipeline deve executar consistentemente em ambientes dev/staging/prod | % de ambientes suportados com execução bem-sucedida | 100% em todos os ambientes em cada release | RF-022, 5.8 spec/00_problem.md | Should |
| RNF-18 | O pipeline deve ser executável em SOs Amazon Linux 2023 ou Ubuntu 22.04 LTS | % de execuções bem-sucedidas no SO suportado | 100% em ambos os SOs | 5.8 spec/00_problem.md, requisitos AWS | Should |

---

## Premissas (Assumptions)
1. O formato CSV de entrada segue o schema definido pela Operação Olist
2. As instâncias EC2 utilizadas têm recursos mínimos de CPU/RAM para processar ~100k pedidos em ≤2 horas
3. O Postgres 14+ e Grafana 10+ estão disponíveis e configurados corretamente em todos os ambientes
4. O SSO Olist está operacional para controle de acesso
5. A criptografia de dados em trânsito usa TLS 1.2+ e em repouso usa AES-256

---

## Fontes de Medição (Measurement Sources)
1. **SLIs de execução do pipeline**: Logs estruturados (RF-015), métricas CloudWatch/Prometheus (RF-014)
2. **SLIs de usabilidade**: Pesquisas trimestrais com clientes internos, tickets de suporte
3. **SLIs de segurança**: Logs de auditoria (RF-015), AWS CloudTrail
4. **SLIs de portabilidade**: Relatórios de execução em CI/CD para múltiplos ambientes
5. **SLIs de desempenho**: Métricas de latência Grafana, timers de execução do pipeline

---

## Tabela Final Resumida (ID, Atributo, SLI, SLO, Fonte, Prioridade)
| ID | Atributo ISO 25010 | SLI | SLO | Fonte | Prioridade |
|----|---------------------|-----|-----|-------|------------|
| RNF-01 | Estabilidade Funcional | % pedidos processados corretamente | ≥99.99% (30d) | RF-001/008/009, 5.1 spec | Must |
| RNF-02 | Estabilidade Funcional | % registros Postgres batem com CSV | 100% (por execução) | RF-009, 5.1 spec | Must |
| RNF-03 | Eficiência de Desempenho | Tempo execução pipeline (horas) | ≤2h (95% execuções, 30d) | RF-018, 5.2 spec | Must |
| RNF-04 | Eficiência de Desempenho | Latência p95 Grafana (segundos) | ≤3s (99% consultas, 7d) | RF-011, 5.2 spec | Should |
| RNF-05 | Compatibilidade | % CSVs conformes ao schema | 100% rejeição não conformes | RF-002, 5.3 spec | Must |
| RNF-06 | Compatibilidade | % execuções com integração OK | 100% (por execução) | RF-003/011, 5.3 spec | Must |
| RNF-07 | Usabilidade | % aprovação usabilidade dashboard | ≥90% (trimestral) | RF-011/012, 5.4 spec | Should |
| RNF-08 | Usabilidade | Tempo debugging (minutos) | ≤15min (95% incidentes) | RF-015, 5.4 spec | Should |
| RNF-09 | Confiabilidade | % reexecuções sem duplicação | 100% (todas reexecuções) | RF-004, 5.5 spec | Must |
| RNF-10 | Confiabilidade | MTTR (minutos) | ≤10min (99% falhas) | RF-005/019, 5.5 spec | Must |
| RNF-11 | Confiabilidade | % retries bem-sucedidos | ≥95% (30d) | RF-006, 5.5 spec | Must |
| RNF-12 | Segurança | % acessos não autorizados bloqueados | 100% bloqueio | RF-017, 5.6 spec | Must |
| RNF-13 | Segurança | % eventos auditoria logados | 100% cobertura (1 ano retenção) | RF-015, 5.6 spec | Must |
| RNF-14 | Segurança | % dados PII criptografados | 100% (todos armazenamentos/transferências) | 5.6 spec, LGPD | Must |
| RNF-15 | Manutenibilidade | % cobertura testes módulos críticos | ≥80% (por release) | RF-022, 5.7 spec | Should |
| RNF-16 | Manutenibilidade | Tempo novo fluxo (dias) | ≤2d (90% solicitações) | 5.7 spec | Could |
| RNF-17 | Portabilidade | % ambientes execução OK | 100% (todos ambientes, por release) | RF-022, 5.8 spec | Should |
| RNF-18 | Portabilidade | % execuções SO suportado OK | 100% (Amazon Linux/Ubuntu) | 5.8 spec, AWS | Should |
