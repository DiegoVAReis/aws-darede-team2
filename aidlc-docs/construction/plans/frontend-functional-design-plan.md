# Plano de Functional Design: Unidade 2 Frontend

Fontes: `unit-of-work.md`, `unit-of-work-story-map.md`, `unit-of-work-dependency.md` (contrato HTTP v1), `components.md` e `component-methods.md` (FC-01 a FC-10), `requirements.md` (FR-06, FR-07, NFR-03, NFR-06), histórias US-10 a US-17 e as regras do Backend já aprovadas (`backend/functional-design/business-rules.md`: texto de até 2000 caracteres, `session_id` com UUID, códigos de erro `VALIDATION_ERROR` 422, `KB_NOT_INDEXED` 503, `UPSTREAM_ERROR` 502 e `INTERNAL_ERROR` 500).

Escopo: lógica de negócio do front (estado das conversas, regras de título, persistência, fluxo de envio, tratamento de erros), modelo de domínio, estrutura e comportamento dos componentes. Sem decisões de infraestrutura nem de biblioteca (ficam para o NFR Requirements). Também identifica as propriedades testáveis exigidas pelo PBT-01.

## Como responder

Preencha a letra depois de cada `[Answer]:`. Para aceitar a sugestão do assistente em todas as perguntas, basta dizer "usa as recomendadas". Se nenhuma opção servir, escolha `X` e descreva depois da tag. A geração dos artefatos só começa depois das suas respostas.

## Checklist de execução

- [x] Step 1: analisar o contexto da unidade
- [x] Step 2: criar este plano
- [x] Step 3: gerar as perguntas
- [x] Step 4: salvar o plano
- [x] Step 5: coletar e analisar as respostas (usuario autorizou as recomendadas: opcao A em Q1 a Q17; sem ambiguidades)
- [x] Step 6a: gerar `aidlc-docs/construction/frontend/functional-design/domain-entities.md`
- [x] Step 6b: gerar `aidlc-docs/construction/frontend/functional-design/business-rules.md`
- [x] Step 6c: gerar `aidlc-docs/construction/frontend/functional-design/business-logic-model.md` (fluxos de envio, conversas, persistência e propriedades testáveis do PBT-01)
- [x] Step 6d: gerar `aidlc-docs/construction/frontend/functional-design/frontend-components.md` (hierarquia, props, estado, interações, validações, endpoints usados)
- [x] Step 7: apresentar a mensagem de conclusão
- [x] Step 8: aprovação do usuário (implícita, "Seguir com o desenvolvimento")
- [x] Step 9: registrar a aprovação no `audit.md` e atualizar o `aidlc-state.md`

---

## Parte 1: Conversas e barra lateral (US-14, US-15)

## Question 1
Título de uma conversa. O título aparece na barra lateral e pode ser renomeado (FR-06.2).

A) Conversa nova se chama "Nova conversa". Ao enviar a primeira pergunta, o título passa a ser o início da pergunta (até 40 caracteres, com "…" se cortar), a menos que o usuário já tenha renomeado a conversa

B) Conversa nova se chama "Nova conversa" e continua assim até o usuário renomear

C) Conversa nova recebe data e hora no título (ex.: "Conversa 28/10 15:40")

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Sem um título derivado da pergunta, a barra lateral fica com várias linhas iguais e o usuário não consegue distinguir as conversas.

[Answer]: A

## Question 2
Clicar em "Nova conversa" quando a conversa atual já está vazia (sem mensagens).

A) Reutilizar: apenas selecionar a conversa vazia que já existe, sem criar outra

B) Sempre criar uma conversa nova, mesmo que já exista uma vazia

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Evita acumular conversas vazias na barra lateral e no `localStorage`.

[Answer]: A

## Question 3
Excluir uma conversa (US-14, cenário 4).

A) Pedir confirmação antes de excluir (diálogo acessível "Excluir esta conversa?")

B) Excluir imediatamente, sem confirmação

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. A exclusão apaga mensagens e fontes do navegador e não tem desfazer.

[Answer]: A

## Question 4
Renomear uma conversa: edição e validação do novo título.

A) Edição na própria linha da barra lateral. Título com até 60 caracteres (depois de aparar). Título vazio ou só espaços cancela a edição e mantém o título anterior. Esc cancela e Enter confirma

B) Mesma edição, mas título vazio volta ao título padrão "Nova conversa"

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. É o comportamento mais previsível e não perde o título anterior por engano.

[Answer]: A

## Question 5
Limite de conversas guardadas no navegador. O Backend mantém só 50 sessões; sessões descartadas voltam como `session_reset: true` (US-10), então o front não precisa espelhar esse limite.

A) Sem limite de quantidade; tratar apenas a falha de espaço do `localStorage` (Pergunta 6)

B) Limite de 50 conversas; ao criar a 51ª, a conversa menos recentemente atualizada é removida

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Uso individual e conversas de texto ocupam pouco espaço. Remover conversas sem o usuário pedir seria uma perda de dados surpreendente.

[Answer]: A

## Question 6
Falha ao gravar no `localStorage` (espaço esgotado ou armazenamento bloqueado).

A) Mostrar um aviso discreto ("Não foi possível salvar as conversas neste navegador") e continuar funcionando em memória

B) Ignorar em silêncio, apenas registrar no console

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O usuário precisa saber que não vai recuperar as conversas ao recarregar (US-15).

[Answer]: A

---

## Parte 2: Envio de perguntas e erros (US-10, US-11)

## Question 7
Validação do texto no campo de entrada. O Backend rejeita texto vazio e acima de 2000 caracteres (depois de aparar).

A) Aparar as pontas; botão Enviar e Enter desabilitados com texto vazio ou só espaços; contador "n/2000" visível a partir de 1800 caracteres; acima de 2000 o envio fica bloqueado com mensagem de apoio no campo

B) Mesmas regras de vazio, mas sem contador: o campo corta a digitação em 2000 caracteres

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Espelha a regra do Backend e evita uma ida à API só para receber `VALIDATION_ERROR`. O corte silencioso da opção B perde texto colado sem avisar.

[Answer]: A

## Question 8
Escopo do estado "carregando" quando o usuário troca de conversa durante uma resposta.

A) Por conversa: enquanto uma conversa aguarda, as outras ficam livres para perguntar. A resposta chega na conversa de origem, mesmo que o usuário tenha trocado de conversa ou ela tenha sido excluída (nesse caso a resposta é descartada)

B) Global: enquanto qualquer pergunta aguarda, o envio fica bloqueado em todas as conversas (a navegação pela barra lateral continua livre)

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O Backend já isola sessões e tem trava por sessão (BR-SES-04). O critério de US-11 (cenário 3) fala em bloquear "na mesma conversa".

[Answer]: A

## Question 9
Tempo limite da chamada do front à API. O Backend usa 60 s por chamada ao Bedrock, e um turno pode ter mais de uma chamada (embedding e modelo).

A) 90 segundos no front. Ao estourar, a requisição é cancelada e aparece um erro de tempo esgotado

B) Sem tempo limite no front (espera até o navegador desistir)

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Sem limite, o indicador de carregamento pode ficar para sempre se a rede cair no meio da resposta.

[Answer]: A

## Question 10
Como mostrar um erro de pergunta (US-11, cenário 4). A mensagem do usuário já foi exibida na conversa.

A) Como uma bolha de erro do assistente na própria lista de mensagens, guardada no histórico. A última bolha de erro tem o botão "Tentar novamente", que reenvia a pergunta anterior sem duplicar a mensagem do usuário

B) Como aviso temporário acima do campo de entrada, não guardado no histórico. O usuário reenvia digitando de novo

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O usuário vê onde a conversa parou, e o `Message.isError` do design já prevê esse formato.

[Answer]: A

## Question 11
Texto das mensagens de erro. O código do corpo da API (`code`) identifica o tipo; falhas de rede e tempo esgotado não vêm da API.

A) Textos fixos em português definidos no front para cada situação: `VALIDATION_ERROR`, `KB_NOT_INDEXED`, `UPSTREAM_ERROR`, `INTERNAL_ERROR`, sem conexão com a API, tempo esgotado e resposta inesperada. O `message` da API não é exibido

B) Exibir o `message` devolvido pela API quando existir, e um texto fixo só para falhas sem corpo (rede, tempo esgotado)

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Mantém a interface toda em português e com o mesmo tom, independente do texto do Backend. Os textos propostos estão na seção "Regras propostas" abaixo.

[Answer]: A

## Question 12
Aviso de contexto reiniciado (US-10, cenário 2 e 3).

A) Aviso discreto dentro da lista de mensagens, logo acima da resposta que veio com `session_reset: true`. Fica guardado no histórico dessa mensagem; por isso aparece uma única vez e continua visível depois de recarregar a página

B) Aviso discreto no topo da conversa, que some quando o usuário envia a próxima pergunta e não é guardado

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Mostra exatamente em que ponto a memória foi perdida. A opção A move o sinalizador do nível da conversa (`Conversation.contextReset` no design) para o nível da mensagem.

[Answer]: A

## Question 13
Página recarregada ou fechada enquanto uma pergunta estava em andamento. Ao reabrir, a conversa termina com uma pergunta do usuário sem resposta.

A) Ao carregar, essa conversa recebe uma bolha de erro "A resposta não foi recebida" com o botão "Tentar novamente"

B) Não alterar nada; o usuário reenvia a pergunta manualmente

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Evita uma conversa que parece esperar uma resposta que nunca vai chegar.

[Answer]: A

---

## Parte 3: Interface (US-11, US-12, US-13)

## Question 14
Sugestões de perguntas na tela inicial (US-13). Elas devem representar temas da base e ser enviadas ao clicar.

A) 4 sugestões fixas, uma por tema: "Qual a garantia padrão dos tratores?" (máquinas), "Como funciona o crédito rural para cooperados?" (crédito), "Quais seguros agrícolas estão disponíveis?" (seguros) e "Quais são os primeiros passos de um novo colaborador?" (onboarding)

B) 6 sugestões fixas, as 4 acima mais "Quais são as regras de uso seguro de defensivos?" (insumos) e "Como funciona a rastreabilidade na exportação de carne?" (proteína)

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Cobre os temas citados na história e cabe em uma grade 2x2. Os textos devem ser conferidos contra a base na etapa de Build and Test.

[Answer]: A

## Question 15
Markdown das respostas (FR-06.1, NFR-03). HTML bruto já é ignorado pelo design.

A) Links abrem em nova aba com `rel="noopener noreferrer"` e só para `http` e `https`; imagens não são carregadas (aparece o texto alternativo); listas, negrito, tabelas e blocos de código funcionam

B) Links aparecem como texto simples, sem clique; imagens não são carregadas

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. As respostas vêm de documentos internos que podem citar endereços, e o bloqueio de imagens evita requisições externas disparadas pelo texto do modelo.

[Answer]: A

## Question 16
Duas abas do navegador abertas ao mesmo tempo, usando o mesmo `localStorage`.

A) Não sincronizar: cada aba trabalha com seu estado e a última gravação vence. O README avisa para usar uma aba por vez

B) Sincronizar pelo evento `storage`: mudanças feitas em uma aba aparecem na outra

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. É uso individual e o requisito não cobre multiaba. A sincronização adiciona estados de corrida (duas abas atualizando a mesma conversa) sem pedido nas histórias.

[Answer]: A

## Question 17
Idioma da interface (rótulos, botões, avisos e erros).

A) Português do Brasil apenas

B) Português e inglês, com troca pelo usuário

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O público é brasileiro e as histórias descrevem a interface em português. O idioma das respostas já acompanha a pergunta (US-07).

[Answer]: A

---

## Regras propostas sem pergunta (confirmar ao responder)

Estas decisões decorrem diretamente das histórias, do contrato ou do Backend aprovado. Entram nos artefatos como estão, a menos que você peça mudança.

| ID | Regra |
|---|---|
| P-01 | O `session_id` de cada conversa é um UUID v4 gerado no navegador ao criar a conversa (compatível com a validação do Backend: 1 a 64 caracteres entre letras, números, `-` e `_`). Nunca muda |
| P-02 | Estado persistido em uma única chave do `localStorage`, com número de versão do formato. Dados ilegíveis, em formato inesperado ou com versão desconhecida: iniciar com uma conversa vazia, sem travar (US-15, cenário 4) |
| P-03 | O estado persistido guarda as conversas (título, `session_id`, mensagens com fontes e avisos, datas) e o id da conversa selecionada. O estado "carregando" nunca é persistido |
| P-04 | A barra lateral ordena as conversas da mais recente para a mais antiga, por data da última atualização (nova mensagem ou renomeação) |
| P-05 | Ao abrir o app sem conversas, criar uma conversa vazia e selecioná-la |
| P-06 | Ao excluir a conversa selecionada, selecionar a mais recente das restantes; se não sobrar nenhuma, criar uma conversa vazia |
| P-07 | O texto enviado é aparado nas pontas. A mensagem do usuário é adicionada à conversa antes da chamada à API |
| P-08 | Resposta de sucesso: adicionar a mensagem do assistente com `answer` (Markdown), `sources` na ordem recebida e sem repetição por arquivo, e `session_reset`. `sources` vazio: nenhuma lista de fontes é exibida |
| P-09 | A mensagem do usuário permanece na conversa quando a chamada falha |
| P-10 | O `session_id` devolvido pela API não substitui o da conversa (o front sempre envia o seu). Se vier diferente, ele é ignorado |
| P-11 | A tela inicial de uma conversa sem mensagens mostra as sugestões; depois da primeira mensagem elas somem |
| P-12 | A lista de mensagens rola até a mensagem mais recente quando chega uma nova mensagem ou o indicador de carregamento |
| P-13 | Cada fonte é exibida como o título H1 em destaque e o nome do arquivo em texto menor ao lado. Fontes com título vazio mostram só o arquivo |
| P-14 | Acessibilidade: elementos semânticos, rótulos nos controles, foco visível, navegação por teclado até campo de entrada, botão Enviar e itens da barra lateral, e anúncio (região `aria-live`) para a chegada de resposta e de erro |
| P-15 | O front não guarda nem exibe segredos e só chama a URL base da API (`http://localhost:8000` por padrão, sobrescrevível por `VITE_API_BASE_URL`) |

Textos fixos propostos para erros (usados se a Pergunta 11 for A):

| Situação | Texto |
|---|---|
| `VALIDATION_ERROR` | "Não consegui processar essa pergunta. Confira o texto e tente de novo." |
| `KB_NOT_INDEXED` | "A base de conhecimento ainda não foi indexada. Peça ao responsável para executar a ingestão." |
| `UPSTREAM_ERROR` | "O serviço de IA não respondeu agora. Tente novamente em instantes." |
| `INTERNAL_ERROR` | "Ocorreu um erro inesperado. Tente novamente." |
| Sem conexão com a API | "Não consegui falar com o assistente. Verifique se o backend está em execução." |
| Tempo esgotado | "A resposta demorou demais. Tente novamente." |
| Resposta inesperada | "Recebi uma resposta que não consegui entender. Tente novamente." |
| Resposta não recebida (Pergunta 13) | "A resposta não foi recebida. Tente novamente." |

Texto fixo proposto para o aviso de contexto reiniciado (US-10): "O contexto desta conversa foi reiniciado. Repita as informações importantes, pois o assistente não lembra do que foi dito antes."

---

## Pré-análise de propriedades testáveis (PBT-01)

Será detalhada no `business-logic-model.md`. Framework previsto para o front: `fast-check` com Vitest (a decisão formal fica para o NFR Requirements, PBT-09). Candidatos já identificados:

| Alvo | Propriedade | Categoria |
|---|---|---|
| `conversationsReducer` | Qualquer sequência de ações válidas mantém o estado válido: ids únicos, conversa selecionada existe (ou não há conversas), `session_id` nunca muda | Invariante |
| `conversationsReducer` | Excluir e depois recriar nunca deixa o app sem conversa selecionada | Invariante |
| `saveConversations` / `loadConversations` | Salvar e carregar devolve o mesmo estado | Round-trip |
| `loadConversations` | Qualquer texto arbitrário no armazenamento resulta em um estado válido, sem exceção | Invariante |
| Título automático | Nunca vazio, no máximo 40 caracteres mais a reticência, sem espaços nas pontas | Invariante |
| Validação do texto | Aceita se e somente se o texto aparado tem de 1 a 2000 caracteres | Invariante |
| Deduplicação de fontes na exibição | Idempotente e sem arquivos repetidos | Idempotência e invariante |
| Ordenação da barra lateral | Resultado é uma permutação da entrada, ordenada por data decrescente | Invariante |
