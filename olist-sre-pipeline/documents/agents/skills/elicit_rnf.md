# Skill: Elicitação de Requisitos Não Funcionais (RNF)
## Propósito
Especializada em levantar requisitos não funcionais para o pipeline SRE da Olist, mapeando os 8 atributos da ISO/IEC 25010 com SLIs mensuráveis, SLOs e priorização MoSCoW.

## Quando Usar
- Ao iniciar o levantamento de requisitos não funcionais do pipeline SRE
- Ao atualizar restrições e atributos de qualidade do pipeline
- Ao preparar documentação de arquitetura e SLIs/SLOs

## Passos do Workflow
1. **Mapeamento de Atributos ISO 25010**
   - Ler `spec/00_problem.md` para identificar stakeholders, fluxos críticos e modos de falha
   - Mapear cada fluxo aos 8 atributos: Estabilidade Funcional, Eficiência de Desempenho, Compatibilidade, Usabilidade, Confiabilidade, Segurança, Manutenibilidade, Portabilidade
   - Validar cobertura completa dos 8 atributos

2. **Definição de SLIs e SLOs**
   - Para cada atributo, propor 1 a 3 RNFs
   - Cada RNF deve ter SLI (indicador) mensurável com unidade (%, segundos, minutos) e janela (30d, 7d, por execução)
   - Cada RNF deve ter SLO (objetivo) numérico com threshold
   - Identificar fonte (RFs ou seções do `spec/00_problem.md`)

3. **Priorização e Validação**
   - Aplicar MoSCoW (Must/Should/Could/Won't) a cada RNF
   - Verificar se nenhum RNF é aspiracional ("ser confiável" é proibido)
   - Validar que todos os RNFs têm unidade e janela definidas
   - Listar premissas e fontes de medição (logs, métricas, pesquisas)

## Template de Requisito Não Funcional
| Campo | Descrição |
|-------|-----------|
| ID | RNF-NN (sequencial, 2 dígitos) |
| Descrição | O que o sistema deve garantir (não aspiracional) |
| SLI | Indicador mensurável com unidade (%, segundos, minutos) e janela (30d, 7d, por execução) |
| SLO | Objetivo numérico com threshold e janela |
| Fonte | RFs ou seções do spec/00_problem.md que originaram o RNF |
| Prioridade | Must / Should / Could / Won't |

## Perguntas Chave
1. Quais SLIs garantem que o pipeline processa 100% dos pedidos sem perda/duplicação?
2. Qual é o SLO de tempo para processamento diário (janela de SLA)?
3. Quais controles de segurança são obrigatórios (SSO, criptografia, auditoria)?
4. Qual é a cobertura mínima de testes para módulos críticos?
5. Em quantos ambientes (dev/staging/prod) o pipeline deve rodar consistentemente?
