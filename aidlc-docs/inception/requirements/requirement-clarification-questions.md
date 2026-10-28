# Perguntas de Esclarecimento de Requisitos (Rodada 2)

Li suas respostas do `requirement-verification-questions.md`. A maioria esta clara e alinhada ao `tech-env.md`. Encontrei 1 interacao entre respostas e 5 pontos ambiguos que precisam de decisao antes de gerar o `requirements.md`.

Responda preenchendo a letra apos a tag `[Answer]:`. Se nenhuma opcao servir, escolha a ultima (Other) e descreva.

---

## Avaliacao de impacto: memoria de conversa no backend (Q4 = C)

Voce pediu para avaliar os impactos. Resumo:

| Area | Impacto | Mitigacao proposta |
|---|---|---|
| Contrato da API | `POST /v1/ask` precisa de um `session_id` (opcional na requisicao, devolvido na resposta). Isso estende o contrato do `tech-env.md` | Campo novo, retrocompativel: sem `session_id` o backend cria uma sessao nova |
| Estado no servidor | O backend passa a guardar uma instancia de agente por sessao em memoria. Sem limite, a memoria cresce | Limite de sessoes ativas (descarte da mais antiga) e janela deslizante de mensagens |
| Reinicio do backend | Qualquer reinicio (inclusive `uvicorn --reload` ao editar codigo) apaga todas as sessoes | Detectar sessao desconhecida e avisar o usuario (ver Question 1) |
| Conflito com Q5 = B | O front guarda o historico no `localStorage`, mas o contexto do modelo vive so na memoria do backend. Apos reiniciar, a tela mostra a conversa inteira e o modelo nao lembra de nada | Decidir a regra na Question 1 |
| Custo e latencia | A cada turno o historico volta ao Nova Pro, e os trechos recuperados de turnos anteriores ocupam contexto (cerca de 3 trechos de ~500 tokens por turno) | Janela deslizante (Question 2) |
| Qualidade da busca | Perguntas curtas como "e a garantia?" so funcionam se o agente reescrever a consulta antes de chamar `retrieve()` | Instrucao no prompt de sistema do agente para reescrever a consulta com base no historico |
| Fontes por turno | As fontes precisam vir apenas das chamadas a `retrieve()` do turno atual, nao do historico | Coletar fontes por requisicao |
| Concorrencia | O agente nao e seguro para chamadas simultaneas na mesma sessao | Trava por sessao; rodar `uvicorn` com 1 worker (mais workers quebrariam a memoria) |
| Testes | A sessao e um componente com estado. Com PBT em modo Parcial, o teste de estado (PBT-06) e apenas orientativo | Teste de unidade do gerenciador de sessoes; modelo de estado opcional |

---

## Question 1
Como tratar a diferenca entre o historico guardado no navegador (Q5 = B) e o contexto do modelo guardado na memoria do backend?

A) Aceitar a limitacao: a tela mantem o historico, e se o backend reiniciar o modelo perde o contexto sem aviso (mais simples)

B) Backend responde com um indicador `session_reset: true` quando recebe um `session_id` desconhecido, e o front exibe um aviso discreto ("contexto da conversa reiniciado")

C) Nao persistir a conversa no `localStorage`: ao recarregar a pagina comeca uma conversa nova, e o estado do front sempre bate com o do backend (abre mao de parte da Q5 = B)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
Qual o tamanho da janela de memoria da conversa por sessao (mensagens mantidas no contexto)?

A) 10 mensagens (cerca de 5 turnos), menor custo e latencia

B) 20 mensagens (cerca de 10 turnos), equilibrio entre contexto e custo

C) Sem limite (maior custo e risco de estourar o contexto em conversas longas)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
"Interface estilo ChatGPT": qual o alcance do layout?

A) Uma unica conversa por vez: mensagens em bolhas, campo de entrada fixo no rodape, respostas renderizadas em Markdown, botao "Nova conversa" (que limpa e cria nova sessao), sugestoes de perguntas na tela inicial

B) Tudo da opcao A, mais barra lateral com a lista de conversas anteriores (cada uma com seu `session_id`, salvas no `localStorage`), com opcao de renomear e excluir

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
Q6: "Mostrar o cabecalho do arquivo". Os documentos de `anyone_kb/` comecam com um titulo H1, por exemplo "UN Proteina — Normas Sanitarias e Inspecao". O que exibir em cada fonte?

A) O titulo H1 do documento (ex.: "UN Proteina — Normas Sanitarias e Inspecao"), com o nome do arquivo em texto menor ao lado

B) Apenas o titulo H1 do documento

C) O titulo H1 mais o cabecalho da secao de onde o trecho foi tirado (ex.: "Controle de temperatura"), para apontar o ponto exato

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
Q2 = B: quando a base nao tem a resposta, o assistente usa conhecimento geral e avisa. Como o sistema decide que "a base nao tem a resposta"?

A) O proprio agente decide, pelo prompt de sistema, avaliando se os trechos recuperados respondem a pergunta; nesse caso `sources` vem vazio e a resposta traz um aviso explicito

B) Limite de distancia no ChromaDB (configuravel por variavel de ambiente): se o melhor trecho passa do limite, o agente recebe "nenhum trecho relevante" e responde com aviso

C) Os dois: limite de distancia como filtro inicial e o agente como decisor final

D) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 6
Q8 = B (contagem real de tokens): o tokenizador do Titan Embeddings v2 nao e publico. Qual tokenizador usar para medir os ~500 tokens por chunk?

A) `tiktoken` com `cl100k_base` (licenca MIT), como aproximacao; margem grande frente ao limite de 8.192 tokens do Titan v2, entao nao ha risco de estouro

B) Tokenizador de outro projeto (descreva abaixo)

C) Other (please describe after [Answer]: tag below)

[Answer]: A
