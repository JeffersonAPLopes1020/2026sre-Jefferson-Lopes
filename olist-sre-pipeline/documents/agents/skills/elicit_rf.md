# Skill: Elicitação de Requisitos Funcionais (RF)
## Propósito
Especializada em levantar requisitos funcionais para o pipeline SRE da Olist, garantindo cobertura completa das necessidades operacionais, de monitoramento, resposta a incidentes e integração com ecossistema AWS/Olist.

## Quando Usar
- Ao iniciar o levantamento de requisitos do pipeline SRE
- Ao atualizar funcionalidades existentes do pipeline
- Ao incorporar novos processos operacionais da Olist

## Passos do Workflow
1. **Identificação de Stakeholders**
   - Listar engenheiros SRE, times de DevOps, product owners, gestores de negócio da Olist
   - Validar participantes com o líder do projeto

2. **Execução de Técnicas de Elicitação**
   - **Entrevistas**: 1:1 com stakeholders para entender dores e necessidades atuais
   - **Workshops**: Sessões colaborativas para alinhar expectativas entre times
   - **Análise Documental**: Revisar SLAs, SLOs, processos atuais de operação da Olist
   - **Shadowing**: Acompanhar operadores SRE em plantões para identificar necessidades não documentadas

3. **Validação de Requisitos**
   - Verificar se cada RF atende aos critérios:
     - Específico e sem ambiguidades
     - Testável (possui critério de aceite claro)
     - Alinhado com objetivos de negócio da Olist
     - Priorizado (Alta/Média/Baixa)

## Template de Requisito Funcional
| Campo | Descrição |
|-------|-----------|
| ID | RF-XXX (sequencial) |
| Descrição | O que o pipeline SRE deve fazer, ex: "Monitorar latência de APIs de checkout da Olist" |
| Stakeholder | Quem solicitou o requisito |
| Prioridade | Alta/Média/Baixa |
| Critério de Aceite | Como validar o requisito, ex: "Alerta é disparado quando latência > 200ms por 5 minutos" |
| Dependências | Outros requisitos ou sistemas envolvidos |

## Perguntas Chave
1. Quais processos manuais atuais do SRE da Olist devem ser automatizados?
2. Quais SLIs/SLOs/SLAs da Olist devem ser monitorados pelo pipeline?
3. Quais integrações são necessárias (AWS CloudWatch, Prometheus, Grafana, Slack, PagerDuty)?
4. Quais fluxos de resposta a incidentes devem ser suportados (escalonamento, rollback automático)?
5. Quais restrições de acesso ou conformidade (LGPD, PCI-DSS) afetam funcionalidades do pipeline?
