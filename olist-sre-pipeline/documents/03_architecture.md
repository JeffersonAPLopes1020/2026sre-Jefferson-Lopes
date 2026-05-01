# Arquitetura RM-ODP - Pipeline ETL Olist

## Contexto
Pipeline ETL para processar ~100 mil pedidos diários do marketplace Olist, carregar em banco analítico e gerar dashboards. Arquitetura baseada em 5 viewpoints RM-ODP, respeitando restrições do AWS Academy Learner Lab (sem AWS Glue, sem Amazon Redshift).

---

## 1. Enterprise Viewpoint

### Objetivos de Negócio
- Processar ~100 mil pedidos diários do marketplace Olist sem perda ou duplicação
- Disponibilizar dados analíticos via dashboards Grafana para tomada de decisão
- Garantir confiabilidade operacional com observabilidade completa

### Stakeholders
| Stakeholder | Interesse | RFs Atendidos |
|-------------|-----------|---------------|
| Operação Olist (negócio) | Processar ~100mil pedidos diários | RF-001, RF-008, RF-009, RF-013, RF-018 |
| Time de Dados | Carregar em banco analítico e gerar dashboards | RF-001, RF-003, RF-004, RF-011, RF-024 |
| Clientes Internos do Dashboard | Consumir dados para tomada de decisão | RF-011, RF-012, RF-013 |
| Plataforma / SRE | Garantir confiabilidade e observabilidade | RF-002, RF-004 a RF-007, RF-010, RF-014 a RF-017, RF-019 a RF-023 |
| Plataforma / SRE | Controlar custos AWS | RF-021 |

### Restrições
- AWS Academy Learner Lab: sem AWS Glue, sem Amazon Redshift
- Pipeline deve rodar em instâncias EC2
- Uso de Postgres como banco analítico (RDS ou self-hosted)

---

## 2. Information Viewpoint

### Modelo de Informação

#### Fonte: CSV de Pedidos Olist
```
order_id (PK), customer_id, order_status, order_purchase_timestamp, 
order_approved_at, order_delivered_carrier_date, order_delivered_customer_date,
order_estimated_delivery_date, ...
```

#### Destino: Postgres Analítico (Tabela `olist_orders`)
| Coluna | Tipo | Restrição | RF Atendido |
|--------|------|-----------|-------------|
| order_id | VARCHAR(50) | PRIMARY KEY (garante idempotência) | RF-004, RF-009 |
| customer_id | VARCHAR(50) | NOT NULL | RF-001 |
| order_status | VARCHAR(20) | NOT NULL | RF-001 |
| order_purchase_timestamp | TIMESTAMP | NOT NULL | RF-001 |
| ... | ... | ... | ... |
| processed_at | TIMESTAMP | DEFAULT NOW() | RF-013 (traçabilidade) |
| source_file | VARCHAR(255) | NOT NULL | RF-013 (traçabilidade) |
| batch_id | UUID | NOT NULL | RF-015 (auditoria) |

### Fluxos de Informação
```
[CSV S3] → [Validação/Parse] → [Transformação] → [Load Postgres] → [Dashboard Grafana]
   │              │                   │                  │                    │
   └── RF-001     └── RF-002         └── RF-003        └── RF-004         └── RF-011
   └── RNF-05     └── RNF-05         └── RNF-01        └── RNF-09         └── RNF-04
```

### Metadados de Execução (Tabela `pipeline_executions`)
| Campo | Tipo | Descrição | RNF Atendido |
|-------|------|-----------|--------------|
| execution_id | UUID | PK, identificador único | RF-015 |
| source_file | VARCHAR(255) | Arquivo processado | RF-013 |
| status | VARCHAR(20) | success/failed/running | RF-023 |
| started_at | TIMESTAMP | Início | RF-014 |
| finished_at | TIMESTAMP | Fim | RF-014 |
| records_read | INT | Lidos do CSV | RF-008 |
| records_loaded | INT | Carregados no Postgres | RF-008 |
| error_details | TEXT | Erros detalhados | RF-015 |

---

## 3. Computational Viewpoint

### Componentes e Serviços

#### 3.1 Ingestion Service (Ingestão)
- **Responsabilidade**: Ler arquivos CSV do S3, validar schema, parsear registros
- **Interface**: `ingest(csv_path: str) → List[OrderRecord]`
- **RFs**: RF-001, RF-002
- **RNFs**: RNF-01, RNF-05, RNF-10

#### 3.2 Transformation Service (Transformação)
- **Responsabilidade**: Limpar, normalizar e preparar dados para carga
- **Interface**: `transform(records: List[OrderRecord]) → List[OrderRecord]`
- **RFs**: RF-003
- **RNFs**: RNF-01, RNF-02

#### 3.3 Load Service (Carga)
- **Responsabilidade**: Inserir dados no Postgres com idempotência (upsert via PK)
- **Interface**: `load(records: List[OrderRecord], batch_id: UUID) → LoadResult`
- **RFs**: RF-003, RF-004, RF-007, RF-008, RF-009
- **RNFs**: RNF-01, RNF-02, RNF-09, RNF-10

#### 3.4 Checkpoint Service (Recuperação)
- **Responsabilidade**: Persistir progresso para recovery em falhas
- **Interface**: `save_checkpoint(execution_id: UUID, offset: int)`, `get_checkpoint(execution_id: UUID) → int`
- **RFs**: RF-005, RF-007, RF-019
- **RNFs**: RNF-10, RNF-11

#### 3.5 Monitoring Service (Observabilidade)
- **Responsabilidade**: Expor métricas, health check, logs estruturados
- **Interface**: `GET /health`, `GET /metrics`, `log(level, message, context)`
- **RFs**: RF-014, RF-015, RF-016, RF-018, RF-020, RF-023
- **RNFs**: RNF-08, RNF-11

#### 3.6 Alerting Service (Alertas)
- **Responsabilidade**: Detectar anomalias e disparar alertas
- **Interface**: `alert(type: AlertType, message: str, severity: str)`
- **RFs**: RF-010, RF-016, RF-017, RF-021
- **RNFs**: RNF-11

#### 3.7 Dashboard Service (Visualização)
- **Responsabilidade**: Atualizar dashboards Grafana com dados processados
- **Interface**: `refresh_dashboard()`
- **RFs**: RF-011, RF-012, RF-013
- **RNFs**: RNF-04, RNF-07

---

## 4. Engineering Viewpoint

### Arquitetura de Deploy e Distribuição

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Academy Learner Lab                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              EC2 Instance (Amazon Linux 2023)           │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │   Pipeline  │  │  Postgres   │  │   Grafana   │    │  │
│  │  │   Python    │  │  (Self or   │  │   (Docker)  │    │  │
│  │  │   Scripts   │  │   RDS)      │  │             │    │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │  │
│  │         │                │                │            │  │
│  │         └────────────────┼────────────────┘            │  │
│  │                          │                             │  │
│  │  ┌───────────────────────┴───────────────────────┐    │  │
│  │  │            CloudWatch Agent                    │    │  │
│  │  │    (Logs estruturados + Métricas custom)       │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────┴────────────────────────┐          │
│  │              S3 Bucket (Olist Data)              │          │
│  │  ├── raw/orders_YYYYMMDD.csv                    │          │
│  │  ├── processed/                                 │          │
│  │  └── failed/                                    │          │
│  └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Mecanismos de Resiliência
1. **Retry com Backoff** (RF-006, RNF-11):
   - Falhas de conexão Postgres: até 3 retries com exponential backoff
   - Timeout configurável por operação

2. **Checkpointing** (RF-005, RF-007, RNF-10):
   - Tabela `pipeline_checkpoints` armazena progresso (execution_id, offset)
   - Recuperação: ler checkpoint, retomar do offset salvo

3. **Atomicidade** (RF-007, RNF-01):
   - Usar transações Postgres para carga
   - Em falha: ROLLBACK, estado consistente preservado

4. **Idempotência** (RF-004, RNF-09):
   - UPSERT via `INSERT ... ON CONFLICT (order_id) DO NOTHING`
   - Reexecuções não duplicam registros

### Concorrência e Escalabilidade
- Execução single-threaded (processa ~100k em ≤2h conforme RNF-03)
- Múltiplos arquivos CSV processados sequencialmente
- Pool de conexões Postgres (max 10 connections)

---

## 5. Technology Viewpoint

### Stack Tecnológica (Restrições AWS Academy)

| Camada | Tecnologia | Versão | RF Atendido | RNF Atendido |
|--------|------------|--------|-------------|--------------|
| **Compute** | EC2 (t2.micro ou t3.small) | Amazon Linux 2023 | RF-001, RF-003 | RNF-18 |
| **Storage (Landing)** | S3 | - | RF-001 | RNF-05, RNF-17 |
| **Database** | Postgres | 14+ (RDS ou Docker) | RF-003, RF-004, RF-008 | RNF-06, RNF-09 |
| **Analytics Dashboard** | Grafana | 10+ (Docker) | RF-011, RF-012, RF-013 | RNF-04, RNF-06, RNF-07 |
| **Language** | Python | 3.11+ | RF-001 a RF-024 | RNF-03, RNF-15 |
| **Libraries** | pandas, psycopg2, boto3 | latest | RF-002, RF-003 | RNF-01, RNF-02 |
| **Monitoring** | CloudWatch + Prometheus | - | RF-014, RF-018, RF-020 | RNF-08, RNF-11 |
| **Logging** | Python logging (JSON) | - | RF-015 | RNF-08, RNF-13 |
| **Alerting** | CloudWatch Alarms + SNS | - | RF-016, RF-017, RF-021 | RNF-11 |
| **Orchestration** | Cron ou systemd timer | - | RF-001, RF-018 | RNF-03 |
| **Security** | IAM Roles, TLS 1.2+, AES-256 | - | - | RNF-12, RNF-14 |
| **Audit** | CloudTrail + Postgres logs | - | RF-015 | RNF-13 |

### Configuração de Ambientes (RF-022, RNF-17)
```
config/
├── dev.yaml      # Desenvolvimento: S3 bucket dev, Postgres local
├── staging.yaml  # Homologação: S3 bucket staging, RDS pequeno
└── prod.yaml     # Produção: S3 bucket prod, RDS multi-AZ
```

---

## 3 Architecture Decision Records (ADRs)

### ADR-001: Uso de Postgres como Banco Analítico (em vez de Redshift)

**Contexto**: O pipeline precisa carregar ~100k pedidos diários em banco analítico para dashboards Grafana. O AWS Academy Learner Lab não permite uso de Amazon Redshift.

**Decisão**: Utilizar Amazon RDS Postgres 14+ (ou Postgres self-hosted na EC2) como banco analítico.

**Consequências**:
- ✅ Compatível com restrição AWS Academy
- ✅ Integração nativa com Grafana (datasource Postgres)
- ✅ Suporte a transações ACID (garante atomicidade RF-007)
- ✅ UPSERT nativo (`ON CONFLICT`) garante idempotência (RF-004)
- ⚠️ Menor performance para consultas analíticas complexas vs. Redshift (mitigado pelo volume de ~100k registros/dia)
- ⚠️ Escalabilidade vertical limitada (mitigado por volume controlado)

---

### ADR-002: Ingestão via Python Scripts (em vez de AWS Glue)

**Contexto**: O pipeline precisa processar arquivos CSV diários. AWS Glue não é permitido no AWS Academy Learner Lab.

**Decisão**: Implementar pipeline ETL usando scripts Python (pandas + psycopg2) executando em instância EC2.

**Consequências**:
- ✅ Compatível com restrição AWS Academy
- ✅ Controle total sobre lógica de processamento e tratamento de erros
- ✅ Fácil debugging local e em desenvolvimento (RF-022, RNF-17)
- ✅ Custo zero de compute adicional (usa EC2 existente)
- ⚠️ Gerenciamento manual de infraestrutura (EC2, patches)
- ⚠️ Sem recursos nativos de serverless ETL (mitigado pelo volume de ~100k registros)

---

### ADR-003: Checkpoint em Tabela Postgres (em vez de Arquivo Local)

**Contexto**: O pipeline precisa recuperar execuções interrompidas (RF-005, RF-019). Necessidade de mecanismo de checkpoint persistente e resiliente.

**Decisão**: Armazenar checkpoints de processamento em tabela Postgres (`pipeline_checkpoints`) com campos: execution_id, offset, updated_at.

**Consequências**:
- ✅ Resiliente a falhas de infraestrutura EC2 (dados em Postgres, não em disco local)
- ✅ Transacional: checkpoint salvo junto com carga de dados (mesma transação)
- ✅ Consultável para auditoria e debugging (RF-015, RF-020)
- ✅ Suporta retomada em instância substituta (RF-019)
- ⚠️ Acoplamento com Postgres (mitigado por ser o banco principal do sistema)
- ⚠️ Overhead adicional de escrita a cada batch processado (mitigado por batches de 1000 registros)

---

## Mapeamento Consolidado: Componentes vs RFs vs RNFs

| Componente | RFs Atendidos | RNFs Atendidos |
|------------|---------------|----------------|
| Ingestion Service | RF-001, RF-002 | RNF-01, RNF-05, RNF-10 |
| Transformation Service | RF-003 | RNF-01, RNF-02 |
| Load Service | RF-003, RF-004, RF-007, RF-008, RF-009 | RNF-01, RNF-02, RNF-09, RNF-10 |
| Checkpoint Service | RF-005, RF-007, RF-019 | RNF-10, RNF-11 |
| Monitoring Service | RF-014, RF-015, RF-016, RF-018, RF-020, RF-023 | RNF-08, RNF-11 |
| Alerting Service | RF-010, RF-016, RF-017, RF-021 | RNF-11 |
| Dashboard Service | RF-011, RF-012, RF-013 | RNF-04, RNF-07 |
| EC2 (Compute) | RF-001 a RF-024 | RNF-03, RNF-18 |
| S3 (Storage) | RF-001, RF-002 | RNF-05, RNF-17 |
| Postgres (Database) | RF-003, RF-004, RF-008, RF-009 | RNF-06, RNF-09 |
| Grafana (Dashboard) | RF-011, RF-012, RF-013 | RNF-04, RNF-06, RNF-07 |
| CloudWatch (Monitoring) | RF-014, RF-015, RF-018, RF-020 | RNF-08, RNF-11, RNF-13 |
