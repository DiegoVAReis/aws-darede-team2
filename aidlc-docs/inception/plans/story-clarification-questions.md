# Perguntas de Esclarecimento do Plano de User Stories

Li suas respostas do `story-generation-plan.md`: personas A+Mantenedor (Q1 = B), organização por funcionalidades (Q2 = B), granularidade média de 15 a 20 histórias (Q3 = B), critérios em Dado/Quando/Então (Q4 = A), apenas histórias de usuário (Q5 = B), erros dentro dos critérios (Q6 = A) e prioridade por ordem numérica (Q7 = B).

Encontrei 1 tensão entre respostas e 1 ponto a confirmar.

Responda preenchendo a letra após a tag `[Answer]:`.

---

## Tensão: persona "Mantenedor da base" (Q1 = B) x apenas histórias de usuário (Q5 = B)

Você incluiu a persona técnica "Mantenedor da base" e também pediu que o trabalho técnico (ingestão, gerenciador de sessões, configuração de ambiente, README) não vire história própria. Sem histórias técnicas, a persona ficaria sem nenhuma história.

### Clarification Question 1
Como tratar o Mantenedor?

A) Manter a persona, com histórias de usuário voltadas a ela apenas para o que ela faz como usuário do sistema: executar a ingestão, reindexar sem duplicar e saber se a base está indexada. Sessões, ambiente e README continuam só nos requisitos FR e NFR

B) Remover a persona (volta a Q1 = A): só Colaborador e Cooperado, e a ingestão fica coberta apenas pelos requisitos FR-01

C) Manter a persona apenas em `personas.md`, para dar contexto, sem histórias próprias

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Confirmação: grupos de funcionalidades (Q2 = B)

Para organizar por funcionalidades só com histórias de usuário, proponho estes grupos, alinhados aos requisitos:

| Grupo | Conteúdo | Requisitos |
|---|---|---|
| F1. Base de conhecimento | Executar e repetir a ingestão, verificar a base indexada (Mantenedor, se aprovado) | FR-01 |
| F2. Perguntas e respostas com fontes | Perguntar, receber resposta fundamentada com fonte, pergunta fora da base, idioma | FR-02, FR-03, FR-05 |
| F3. Conversa com memória | Perguntas de acompanhamento, contexto da sessão, aviso de contexto reiniciado | FR-04 |
| F4. Interface de chat | Layout, barra lateral de conversas, sugestões, estados de carregando e erro, exibição das fontes | FR-06 |
| F5. Entrega e uso local | Subir e usar o sistema localmente seguindo o README, sem expor segredos | FR-07 |

### Clarification Question 2
Esses grupos servem?

A) Sim, usar os 5 grupos como estão

B) Usar os grupos, mas juntando F5 ao F1 (setup e ingestão formam um único grupo "Preparar e subir o assistente")

C) Other (please describe after [Answer]: tag below)

[Answer]: A
