# Requisitos Funcionais - Pipeline ETL Olist

## Contexto
Pipeline ETL para processar ~100 mil pedidos diários do marketplace Olist, carregar em banco analítico e gerar dashboards. O sistema deve ser idempotente, observável e resiliente a falhas parciais.

---

## Requisitos Funcionais

| ID | Descrição | Stakeholder | Prioridade | Critério de Aceite | Dependências |
|----|-----------|-------------|------------|-------------------|--------------|
| RF-001 | Ingerir arquivos CSV diários contendo ~100mil pedidos do marketplace | Operação Olist | Alta | Arquivo CSV processado com sucesso; contagem de registros lida corresponde ao total no arquivo | - |
| RF-002 | Validar integridade do arquivo CSV antes do processamento (formato, encoding, estrutura) | Time de Dados / SRE | Alta | Arquivo inválido é rejeitado com erro claro; arquivo válido segue para processamento | RF-001 |
| RF-003 | Carregar dados transformados no banco Postgres analítico | Time de Dados | Alta | Todos os registros válidos são inseridos no Postgres; contagem no destino = contagem na origem | RF-001, RF-002 |
| RF-004 | Garantir idempotência: reexecuções do pipeline não duplicam registros | Time de Dados / SRE | Alta | Executar pipeline 2x com mesmo CSV resulta no mesmo número de registros no banco (sem duplicação) | RF-003 |
| RF-005 | Implementar mecanismo de checkpoint para recuperação de falhas parciais | SRE | Alta | Pipeline interrompido e retomado continua do último ponto processado com sucesso | RF-003 |
| RF-006 | Implementar retry automático para falhas transientes (banco indisponível, timeouts) | SRE | Alta | Falha de conexão temporária aciona retry com backoff; pipeline continua após recuperação | RF-003 |
| RF-007 | Garantir atomicidade: pipeline executa por completo ou falha de forma controlada (rollback) | SRE | Alta | Falha durante carga resulta em estado consistente no banco (sem dados parciais visíveis) | RF-003, RF-005 |
| RF-008 | Validar completude: processar todos os ~100mil pedidos diários | Operação Olist | Alta | Contagem final no banco = contagem esperada no CSV (tolerância configurável) | RF-003 |
| RF-009 | Validar exatidão: dados carregados refletem exatamente a origem | Operação Olist | Alta | Checksum ou validação de amostra confirma que dados no banco batem com CSV | RF-003 |
| RF-010 | Detectar e alertar sobre perda silenciosa de linhas (dados não processados sem aviso) | SRE | Alta | Discrepância entre total lido e total carregado gera alerta imediato | RF-008 |
| RF-011 | Gerar/atualizar dashboards Grafana diariamente com dados processados | Clientes Internos | Alta | Dashboard reflete dados do dia atual após conclusão do pipeline | RF-003 |
| RF-012 | Garantir freshness: dashboard mostra dados do dia atual, não stale | Clientes Internos | Média | Dashboard exibe timestamp da última atualização; dados obsoletos (>24h) sinalizados visualmente | RF-011 |
| RF-013 | Fornecer traçabilidade: auditar origem de cada número no dashboard | Operação Olist | Média | Cada métrica no dashboard possui referência ao arquivo CSV e timestamp de processamento | RF-011 |
| RF-014 | Expor métricas de execução do pipeline (sucesso/falha, duração, throughput) | SRE | Alta | Métricas disponíveis em endpoint ou sistema de monitoramento (CloudWatch/Prometheus) | RF-001, RF-003 |
| RF-015 | Gerar logs estruturados para debugging e auditoria | SRE / Time de Dados | Alta | Cada etapa do pipeline gera logs com nível, timestamp, contexto e identificador de execução | - |
| RF-016 | Alertar sobre falhas do pipeline ou violação de SLA | SRE | Alta | Alerta enviado via canal configurado (Slack/Email/PagerDuty) em caso de falha ou atraso | RF-014 |
| RF-017 | Alertar sobre problemas de qualidade de dados (corrupção, duplicação detectada) | Operação Olist / SRE | Alta | Alerta imediato ao detectar anomalias nos dados processados | RF-008, RF-009, RF-010 |
| RF-018 | Monitorar SLA de processamento diário (janela de tempo para conclusão) | Operação Olist / SRE | Média | Pipeline conclui processamento dentro da janela SLA configurada; violação gera alerta | RF-014 |
| RF-019 | Tratar falha de infraestrutura (ex: queda de EC2 durante execução) | SRE | Alta | Queda de instância não corrompe dados; pipeline pode ser retomado ou executado em instância substituta | RF-005, RF-007 |
| RF-020 | Fornecer histórico de execuções do pipeline para auditoria | SRE | Média | Histórico armazenado por 90 dias; consulta via CLI (`pipeline history --last 10`) ou API (`GET /executions?limit=10`); cada registro contém: ID de execução, timestamp início/fim, status (sucesso/falha), duração, arquivo processado, contagem de registros lidos/carregados, erros detalhados | RF-015 |
| RF-021 | Monitorar e alertar sobre custo AWS anômalo | Plataforma / SRE | Média | Custo diário acima do threshold configurado gera alerta antes de explodir | - |
| RF-022 | Suportar múltiplos ambientes (dev/staging/prod) | SRE / Time de Dados | Média | Pipeline executa consistentemente em diferentes ambientes com configurações isoladas | - |
| RF-023 | Fornecer health check do pipeline (status de saúde) | SRE | Média | Endpoint ou comando retorna status atual do pipeline (running, healthy, degraded, down) | RF-014 |
| RF-024 | Permitir reprocessamento manual de arquivo específico sob demanda | Time de Dados | Baixa | Comando ou interface permite reprocessar um CSV específico sem afetar outros | RF-004, RF-005 |

---

## Resumo por Prioridade
- **Alta (16)**: RF-001 a RF-010, RF-014 a RF-017, RF-019
- **Média (6)**: RF-012, RF-013, RF-018, RF-020, RF-021, RF-022, RF-023
- **Baixa (1)**: RF-024

## Stakeholders Atendidos
- **Operação Olist**: RF-001, RF-008, RF-009, RF-013, RF-018
- **Time de Dados**: RF-001, RF-003, RF-004, RF-011, RF-024
- **Clientes Internos**: RF-011, RF-012, RF-013
- **SRE / Plataforma**: RF-002, RF-004, RF-005, RF-006, RF-007, RF-010, RF-014, RF-015, RF-016, RF-017, RF-019, RF-020, RF-021, RF-022, RF-023
