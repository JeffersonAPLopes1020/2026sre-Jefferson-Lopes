# Problema: Pipeline ETL do Olist

## Contexto

O negócio Olist precisa processar ~100 mil pedidos do marketplace, carregar em um banco analítico e gerar dashboards diários. O ETL deve ser confiável: idempotente, observável e resiliente a falhas parciais. Não podemos perder dados, nem duplicá-los, nem sofrer silenciosamente.

---

## Pergunta Orientadora

**O que o sistema precisa garantir para que o negócio confie nos números do dashboard?**

---

## 1. Stakeholders

| Stakeholder | Interesse |
|-------------|-----------|
| Operação Olist (negócio) | Processar ~100mil pedidos diários do marketplace |
| Time de dados | Carregar em banco analítico e gerar dashboards |
| Clientes internos do dashboard | Consumir dados para tomada de decisão |
| Plataforma / SRE | Garantir confiabilidade e observabilidade |

## 2. Fluxos Críticos

- **Ingestão diária**: CSV → Postgres
- **Consulta de dashboards**: Grafana
- **Observação de SLA**: Monitoramento de pipeline

## 3. Modos de Falha

| Falha | Impacto |
|-------|---------|
| Arquivo corrompido ou parcial | Perda de dados |
| Reprocesso duplicando linhas | Duplicação de dados |
| Queda de EC2 durante o run | Falha parcial |
| Banco indisponível | Pipeline travado |

## 4. Riscos Sistêmicos

- **Perda silenciosa de linhas**: Dados não processados sem aviso
- **Dashboard mostrando dado stale**: Informação desatualizada
- **Custo AWS explodindo**: Infra sem controle
- **Dívida técnica de IA mal revisada**: Código de baixa qualidade

---

## 5. Requisitos Não Funcionais (8 Eixos ISO/IEC 25010)

### 5.1 Estabilidade Funcional
- O pipeline deve processar corretamente todos os ~100mil pedidos
- Dados carregados devem refletir exatamente a origem
- Nenhuma perda ou duplicação de registros

### 5.2 Eficiência de Desempenho
- Processamento diário deve completar dentro da janela de SLA
- Tempo de resposta para consultas no dashboard acceptable

### 5.3 Compatibilidade
- Formato CSV padronizado para entrada
- Integração com Postgres e Grafana

### 5.4 Usabilidade
- Dashboards intuitivos para clientes internos
- Logs claros para debugging

### 5.5 Confiabilidade
- Idempotência: reexecuções não duplicam dados
- Resiliência: falhas parciais não corrompem dados
- Recuperação: possível retomar de ponto de falha

### 5.6 Segurança
- Acesso controlado aos dados
- Logs de auditoria

### 5.7 Manutenibilidade
- Código modular e testável
- Pipeline fácil de evoluir

### 5.8 Portabilidade
- Capacidade de executar em diferentes ambientes (dev/staging/prod)

---

## 6. Garantias do Sistema

Para que o negócio confie nos números do dashboard, o sistema deve garantir:

1. **Completude**: Todos os ~100mil pedidos devem ser processados
2. **Exactidão**: Dados carregados devem refletir exatamente a origem
3. **Atomicidade**: Pipeline executa por completo ou falha de forma controlada
4. **Idempotência**: Execuções repetidas não geram duplicação
5. **Observabilidade**: Qualquer falha é visível e acionável
6. **Freshness**: Dashboard mostra dados do dia atual
7. **Traçabilidade**: É possível auditar a origem de cada número