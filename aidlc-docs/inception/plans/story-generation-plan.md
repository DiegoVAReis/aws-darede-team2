# Plano de Geração de User Stories

Papel assumido: product owner. Fonte: `aidlc-docs/inception/requirements/requirements.md`.

## Parte A. Perguntas de planejamento

Responda preenchendo a letra após a tag `[Answer]:`. Todas as perguntas precisam de resposta antes da geração. Se nenhuma opção servir, escolha a última (Other) e descreva. Evite respostas do tipo "depende" ou "mistura de A e B": se quiser combinar opções, descreva a regra exata em Other.

### Question 1
Quais personas devem constar nas histórias?

A) Duas personas da visão: Colaborador (novo ou de outra área) e Cooperado

B) As duas da opção A, mais uma persona técnica "Mantenedor da base" (quem executa a ingestão e atualiza os documentos de `anyone_kb/`)

C) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 2
Qual abordagem de organização das histórias?

A) Baseada em jornadas do usuário (ex.: primeira pergunta, pergunta de acompanhamento, gerenciar conversas), seguindo o fluxo de uso

B) Baseada em funcionalidades (ingestão, recuperação, agente, sessões, API, interface), seguindo os componentes do sistema

C) Em épicos com sub-histórias: cada épico agrupa uma capacidade (ex.: "Base de conhecimento", "Assistente conversacional", "Interface de chat", "Entrega e documentação")

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 3
Qual o nível de granularidade das histórias?

A) Grossa: cerca de 8 a 10 histórias, cada uma cobrindo uma capacidade inteira

B) Média: cerca de 15 a 20 histórias, cada uma pequena o bastante para ser implementada e testada de forma independente

C) Fina: mais de 25 histórias, com variações de cenário separadas

D) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 4
Qual o formato das histórias e dos critérios de aceitação?

A) "Como [persona], quero [ação], para [benefício]", com critérios em Dado/Quando/Então (estilo Gherkin)

B) "Como [persona], quero [ação], para [benefício]", com critérios em lista de verificação (checklist)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 5
Como tratar o trabalho técnico sem usuário final direto (ingestão, gerenciador de sessões, configuração de ambiente, README)?

A) Histórias técnicas ("enablers") escritas para a persona técnica ou para a equipe de desenvolvimento, junto às histórias de usuário

B) Apenas histórias de usuário; o trabalho técnico fica coberto pelos requisitos FR e NFR e pelo plano de código

C) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 6
Cenários de erro e de borda (pergunta fora da base, texto vazio, falha do Bedrock, sessão reiniciada, base não indexada): como representar?

A) Dentro dos critérios de aceitação das histórias principais

B) Em histórias próprias, separadas das histórias do caminho feliz

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 7
Como indicar a prioridade das histórias?

A) MoSCoW (Must, Should, Could, Won't) para o MVP do workshop

B) Ordem numérica de implementação (1, 2, 3...) refletindo as dependências

C) Sem prioridade; todas fazem parte do MVP

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Parte B. Abordagens de organização consideradas

| Abordagem | Vantagem | Contrapartida |
|---|---|---|
| Jornada do usuário | Histórias refletem o uso real e facilitam a demonstração ao vivo | Histórias técnicas ficam espalhadas ou ausentes |
| Funcionalidades | Mapeia direto para módulos de código e testes | Perde a visão do usuário |
| Épicos com sub-histórias | Boa visão geral e rastreabilidade aos requisitos | Mais artefatos para manter |
| Por persona | Destaca diferenças entre colaborador e cooperado | Neste projeto as duas personas usam a mesma interface, o que gera histórias repetidas |
| Por domínio de negócio | Útil quando há muitos domínios | A base tem 15 documentos de domínios diferentes, mas o comportamento do sistema é o mesmo para todos |

## Parte C. Checklist de execução (após aprovação deste plano)

### Fase 1. Preparação
- [x] Reler `requirements.md` e as respostas desta Parte A
- [x] Definir a estrutura de organização aprovada (Question 2) e o nível de granularidade (Question 3)

### Fase 2. Personas
- [x] Gerar `aidlc-docs/inception/user-stories/personas.md` com arquétipos, objetivos, dores, contexto de uso e frases típicas
- [x] Mapear cada persona às capacidades do sistema que ela usa

### Fase 3. Histórias
- [x] Escrever as histórias no formato aprovado (Question 4), seguindo os critérios INVEST (independentes, negociáveis, valiosas, estimáveis, pequenas e testáveis)
- [x] Incluir critérios de aceitação em cada história, cobrindo caminho feliz e os cenários de erro conforme a Question 6
- [x] Incluir histórias técnicas se aprovado na Question 5
- [x] Atribuir prioridade conforme a Question 7
- [x] Referenciar em cada história os requisitos FR e NFR relacionados
- [x] Gerar `aidlc-docs/inception/user-stories/stories.md`

### Fase 4. Validação
- [x] Verificar que todos os requisitos FR-01 a FR-07 estão cobertos por pelo menos uma história
- [x] Verificar que cada história tem persona, critérios testáveis e referência a requisitos
- [x] Incluir uma matriz de rastreabilidade história x requisito no `stories.md`
- [x] Atualizar `aidlc-state.md` e registrar no `audit.md`

## Parte D. Decisões consolidadas (respostas validadas, sem ambiguidades pendentes)

| Tema | Decisão | Origem |
|---|---|---|
| Personas | Colaborador, Cooperado e Mantenedor da base | Q1 = B |
| Mantenedor | Histórias apenas para o que a persona faz como usuária: executar a ingestão, reindexar sem duplicar, saber se a base está indexada | Esclarecimento 1 = A |
| Organização | Por funcionalidades, em 5 grupos: F1 Base de conhecimento, F2 Perguntas e respostas com fontes, F3 Conversa com memória, F4 Interface de chat, F5 Entrega e uso local | Q2 = B, Esclarecimento 2 = A |
| Granularidade | Média, cerca de 15 a 20 histórias independentes | Q3 = B |
| Formato | "Como [persona], quero [ação], para [benefício]" com critérios em Dado/Quando/Então | Q4 = A |
| Trabalho técnico | Sem histórias técnicas; sessões, ambiente e README ficam cobertos pelos requisitos FR e NFR | Q5 = B |
| Erros e bordas | Dentro dos critérios de aceitação das histórias principais | Q6 = A |
| Prioridade | Ordem numérica de implementação, refletindo dependências | Q7 = B |
| Rastreabilidade | Cada história referencia os requisitos FR e NFR e entra em uma matriz história x requisito | Plano, Fase 3 e 4 |

### Reconciliação registrada após a geração

| Ponto | Tratamento |
|---|---|
| Esclarecimento 1 = A dizia que sessões, ambiente e README ficam só nos requisitos, e o Esclarecimento 2 = A confirmou o grupo F5 ("Entrega e uso local") | O grupo F5 foi mantido com duas histórias para o Mantenedor (US-16 e US-17), escritas como resultados de uso. As tarefas técnicas (gerenciador de sessões, configuração de ambiente, fixação de versões, escrita do README) continuam apenas nos requisitos FR e NFR |
| Duas personas de usuário final usam a mesma interface | O `personas.md` e o `stories.md` passam a indicar "histórias principais" por persona, e registram que US-04 a US-15 valem para ambas |
