# Regras de Negócio: Frontend

Cada regra indica a origem: pergunta do plano (Q1 a Q17), regra proposta (P-01 a P-15) ou requisito. Todas as respostas do plano foram a opção A (recomendada), por delegação do usuário.

## Conversas e barra lateral (US-14, US-15)

| ID | Regra | Origem |
|---|---|---|
| BR-CNV-01 | Uma conversa nova tem o título "Nova conversa", um `id` e um `sessionId` (UUID v4) gerados no navegador. O `sessionId` nunca muda | Q1, P-01 |
| BR-CNV-02 | Ao enviar a primeira pergunta de uma conversa vazia, o título passa a ser o início da pergunta, desde que o usuário não tenha renomeado a conversa (`titleIsCustom = false`). O título automático: troca sequências de espaços e quebras de linha por um espaço, apara as pontas, mantém até 40 caracteres (pontos de código) e acrescenta "…" quando cortou. Nunca fica vazio (se ficar, usa o título padrão) | Q1 |
| BR-CNV-03 | "Nova conversa" quando já existe uma conversa vazia: seleciona a vazia mais recentemente atualizada e não cria outra | Q2 |
| BR-CNV-04 | Excluir exige confirmação em um diálogo acessível ("Excluir esta conversa?", com "Excluir" e "Cancelar"). Cancelar, Esc ou clicar fora não excluem | Q3 |
| BR-CNV-05 | Excluir apaga a conversa, suas mensagens e fontes do estado e do armazenamento. Se a conversa excluída estava selecionada, seleciona a mais recente das restantes; se não sobrar nenhuma, cria uma conversa vazia | Q3, P-06 |
| BR-CNV-06 | Renomear acontece na própria linha da barra lateral. O novo título é aparado. Vazio ou só espaços: a edição é cancelada e o título anterior permanece. Mais de 60 caracteres: o campo não aceita mais digitação (limite 60) e o reducer corta em 60. Enter confirma, Esc cancela, sair do campo (blur) confirma se o título for válido e cancela caso contrário | Q4 |
| BR-CNV-07 | Renomear marca `titleIsCustom = true` (mesmo que o novo título seja igual ao anterior) e atualiza `updatedAt` | Q1, Q4, P-04 |
| BR-CNV-08 | Não há limite de quantidade de conversas nem de mensagens por conversa | Q5 |
| BR-CNV-09 | A barra lateral ordena da conversa mais recentemente atualizada para a mais antiga. Empates mantêm a ordem existente | P-04 |
| BR-CNV-10 | Ao abrir o app sem nenhuma conversa válida, cria uma conversa vazia e a seleciona | P-05 |
| BR-CNV-11 | Selecionar uma conversa mostra as mensagens dela e passa a usar o `sessionId` dela nas próximas perguntas. Selecionar um id inexistente não muda nada | US-14 |
| BR-CNV-12 | Uma conversa vazia mostra as sugestões de perguntas. Depois da primeira mensagem elas somem | P-11, Q14 |
| BR-CNV-13 | As sugestões são 4 perguntas fixas (lista em `domain-entities.md`). Clicar em uma envia a pergunta como mensagem na conversa atual, pelo mesmo fluxo de envio | Q14, US-13 |

## Envio de perguntas (US-11)

| ID | Regra | Origem |
|---|---|---|
| BR-ENV-01 | O texto é aparado nas pontas antes de validar e de enviar | P-07, Q7 |
| BR-ENV-02 | Texto vazio ou só espaços: o botão Enviar e a tecla Enter ficam sem efeito. Nenhuma chamada é feita | Q7 |
| BR-ENV-03 | Texto com mais de 2000 caracteres (depois de aparar, contados em pontos de código): o envio é bloqueado e o campo mostra uma mensagem de apoio ("A pergunta passa de 2000 caracteres. Encurte o texto.") | Q7 |
| BR-ENV-04 | O contador "n/2000" aparece a partir de 1800 caracteres e usa o texto aparado | Q7 |
| BR-ENV-05 | Enter envia. Shift+Enter insere uma quebra de linha. Enter durante a composição de um método de entrada (IME) não envia | FR-06.1 |
| BR-ENV-06 | O estado "carregando" é por conversa. Enquanto uma conversa aguarda resposta, não é possível enviar outra pergunta nela (botão e Enter sem efeito, indicador de carregamento visível), mas as outras conversas continuam livres | Q8, US-11 |
| BR-ENV-07 | A mensagem do usuário é adicionada à conversa antes da chamada à API e permanece nela se a chamada falhar | P-07, P-09 |
| BR-ENV-08 | A chamada é `POST /v1/ask` com `{ "text": <texto aparado>, "session_id": <sessionId da conversa> }`. O front sempre envia o `sessionId` da conversa | P-01, P-10 |
| BR-ENV-09 | Resposta de sucesso: adiciona uma mensagem do assistente com `content = answer`, `sources` na ordem recebida sem arquivos repetidos (mantém a primeira ocorrência) e `contextReset = true` somente quando `session_reset` for `true` | P-08, Q12 |
| BR-ENV-10 | O `session_id` devolvido pela API não substitui o da conversa. Se vier diferente, é ignorado | P-10 |
| BR-ENV-11 | A resposta chega na conversa que originou a pergunta, mesmo que o usuário tenha selecionado outra conversa no meio. Se a conversa foi excluída, a resposta é descartada | Q8 |
| BR-ENV-12 | Resposta válida mas com `answer` vazio: tratada como `UNEXPECTED_RESPONSE` | P-08 |
| BR-ENV-13 | O texto digitado e ainda não enviado (rascunho) fica no campo ao trocar de conversa e é limpo quando a pergunta é enviada. Não é persistido | decisão de design |
| BR-ENV-14 | A lista de mensagens rola até o fim quando chega uma nova mensagem, o indicador de carregamento aparece ou a conversa é selecionada | P-12 |

## Erros e "Tentar novamente" (US-11, cenário 4)

| ID | Regra | Origem |
|---|---|---|
| BR-ERR-01 | Toda falha de pergunta vira uma bolha de erro do assistente na lista (`isError = true`, `errorKind`), guardada no histórico. O texto é fixo em português por `ErrorKind` (tabela abaixo). O `message` da API nunca é exibido | Q10, Q11 |
| BR-ERR-02 | Classificação: corpo no formato `{ "error": { "code", "message" } }` com `code` conhecido usa o próprio código; `code` desconhecido vira `INTERNAL_ERROR`; falha de `fetch` sem resposta vira `NETWORK`; 90 s sem resposta cancela a chamada e vira `TIMEOUT`; corpo ilegível ou sem os campos esperados (inclusive resposta de sucesso inválida) vira `UNEXPECTED_RESPONSE` | Q9, Q11 |
| BR-ERR-03 | Só a última mensagem da conversa pode mostrar "Tentar novamente", e só se for uma bolha de erro precedida por uma mensagem do usuário | Q10 |
| BR-ERR-04 | "Tentar novamente" remove a bolha de erro, marca a conversa como carregando e reenvia o texto da mensagem do usuário anterior, sem duplicar essa mensagem. Se falhar de novo, aparece uma nova bolha de erro | Q10 |
| BR-ERR-05 | A conversa continua utilizável depois de um erro: o usuário pode digitar uma nova pergunta sem usar "Tentar novamente" | US-11 |
| BR-ERR-06 | Ao carregar o armazenamento, uma conversa cuja última mensagem é do usuário (sem resposta) recebe uma bolha de erro `NO_RESPONSE`. Isso vale só no carregamento inicial | Q13 |
| BR-ERR-07 | O front não expõe segredos, caminhos nem detalhes técnicos em nenhum texto de erro | NFR-03 |

Textos fixos por `ErrorKind`:

| `ErrorKind` | Texto |
|---|---|
| `VALIDATION_ERROR` | "Não consegui processar essa pergunta. Confira o texto e tente de novo." |
| `KB_NOT_INDEXED` | "A base de conhecimento ainda não foi indexada. Peça ao responsável para executar a ingestão." |
| `UPSTREAM_ERROR` | "O serviço de IA não respondeu agora. Tente novamente em instantes." |
| `INTERNAL_ERROR` | "Ocorreu um erro inesperado. Tente novamente." |
| `NETWORK` | "Não consegui falar com o assistente. Verifique se o backend está em execução." |
| `TIMEOUT` | "A resposta demorou demais. Tente novamente." |
| `UNEXPECTED_RESPONSE` | "Recebi uma resposta que não consegui entender. Tente novamente." |
| `NO_RESPONSE` | "A resposta não foi recebida. Tente novamente." |

"Tentar novamente" aparece para todos os `ErrorKind` da bolha final.

## Aviso de contexto reiniciado (US-10)

| ID | Regra | Origem |
|---|---|---|
| BR-CTX-01 | Uma resposta com `session_reset: true` é guardada com `contextReset = true`. A interface mostra um aviso discreto logo acima dessa resposta: "O contexto desta conversa foi reiniciado. Repita as informações importantes, pois o assistente não lembra do que foi dito antes." | Q12, FR-06.7 |
| BR-CTX-02 | O aviso fica guardado com a mensagem e por isso permanece visível depois de recarregar a página. Aparece uma única vez, porque só a resposta daquele turno traz o sinalizador | Q12, US-10 |
| BR-CTX-03 | As mensagens anteriores permanecem visíveis | US-10 |
| BR-CTX-04 | Conversa recuperada do armazenamento depois do reinício do Backend: a primeira pergunta nova volta com `session_reset: true` e mostra o aviso. Nenhuma regra extra no front | US-15 |

## Persistência (US-15)

| ID | Regra | Origem |
|---|---|---|
| BR-PER-01 | O estado é gravado em uma única chave (`STORAGE_KEY`) com `version`, `activeConversationId` e `conversations`. `pending` e `storageWarning` nunca são gravados | P-02, P-03 |
| BR-PER-02 | A gravação acontece depois de cada mudança em `conversations` ou `activeConversationId`. Mudar só `pending` ou `storageWarning` não regrava | P-03 |
| BR-PER-03 | Carregar: texto ausente, JSON inválido, `version` diferente de `STORAGE_VERSION` ou formato inesperado resulta em estado vazio (uma conversa vazia nova). O front nunca lança exceção nem trava por causa do armazenamento | P-02, US-15 cenário 4 |
| BR-PER-04 | Carregar descarta apenas as conversas inválidas (campos faltando ou com tipo errado, `sessionId` fora do padrão, `id` ou `sessionId` repetido, mensagens malformadas) e mantém as demais. Se nenhuma sobrar, aplica BR-PER-03 | P-02 |
| BR-PER-05 | Se `activeConversationId` não refere uma conversa válida, seleciona a mais recentemente atualizada | P-05 |
| BR-PER-06 | Falha ao gravar (espaço esgotado, armazenamento bloqueado): o app continua funcionando em memória e mostra o aviso "Não foi possível salvar as conversas neste navegador. Elas podem se perder ao recarregar a página." O aviso some quando uma gravação posterior tiver sucesso | Q6 |
| BR-PER-07 | Não há sincronização entre abas: cada aba trabalha com o próprio estado e a última gravação vence. O README orienta usar uma aba por vez | Q16 |

## Interface e Markdown (US-11, US-12)

| ID | Regra | Origem |
|---|---|---|
| BR-UI-01 | Toda a interface (rótulos, botões, avisos, erros) é em português do Brasil | Q17 |
| BR-UI-02 | Cada fonte mostra o título H1 e, ao lado, o nome do arquivo em texto menor. Fonte com título vazio mostra só o arquivo. Fontes aparecem na ordem recebida, sem repetição | P-13, FR-06.6, US-12 |
| BR-UI-03 | `sources` vazia: nenhuma lista de fontes é exibida. O aviso de "fora da base" já está no texto da resposta | FR-06.8, US-12 |
| BR-UI-04 | O texto do assistente é renderizado como Markdown: listas, negrito, tabelas e blocos de código. O texto do usuário e as bolhas de erro são texto simples | FR-06.1 |
| BR-UI-05 | Links de Markdown abrem em nova aba com `rel="noopener noreferrer"` e somente para `http` e `https`. Outros protocolos (`javascript:` e similares) aparecem como texto, sem link | Q15 |
| BR-UI-06 | Imagens de Markdown não são carregadas: aparece o texto alternativo. HTML bruto é ignorado | Q15, NFR-03 |
| BR-UI-07 | O front não contém nem exibe credenciais e só chama `API_BASE_URL`. O único endpoint usado é `POST /v1/ask` | FR-06.9, P-15 |

## Acessibilidade (US-11, cenário 7)

| ID | Regra | Origem |
|---|---|---|
| BR-A11Y-01 | Elementos semânticos: `nav` para a barra lateral, `main` para o chat, `form` para o campo de entrada, `ul` para as listas | P-14 |
| BR-A11Y-02 | Todo controle tem rótulo acessível (por exemplo, "Nova conversa", "Renomear conversa {título}", "Excluir conversa {título}", "Enviar pergunta", "Digite sua pergunta"). A conversa selecionada tem `aria-current="true"` | P-14 |
| BR-A11Y-03 | Navegação completa por teclado até o campo de entrada, o botão Enviar e os itens da barra lateral, com foco visível | P-14 |
| BR-A11Y-04 | A lista de mensagens é uma região `role="log"` com `aria-live="polite"`, para anunciar a chegada de respostas e de erros. O indicador de carregamento tem texto acessível ("Aguardando resposta") | P-14 |
| BR-A11Y-05 | O diálogo de confirmação de exclusão usa `role="alertdialog"`, leva o foco ao abrir, prende o foco dentro dele, fecha com Esc e devolve o foco ao controle que o abriu | Q3, P-14 |
| BR-A11Y-06 | O aviso de falha de gravação e o aviso de contexto reiniciado têm `role="status"` | Q6, Q12 |

## Rastreabilidade das respostas do plano

| Pergunta | Resposta | Regras |
|---|---|---|
| Q1 | A | BR-CNV-01, BR-CNV-02, BR-CNV-07 |
| Q2 | A | BR-CNV-03 |
| Q3 | A | BR-CNV-04, BR-CNV-05, BR-A11Y-05 |
| Q4 | A | BR-CNV-06 |
| Q5 | A | BR-CNV-08 |
| Q6 | A | BR-PER-06 |
| Q7 | A | BR-ENV-01 a BR-ENV-04 |
| Q8 | A | BR-ENV-06, BR-ENV-11 |
| Q9 | A | BR-ERR-02 |
| Q10 | A | BR-ERR-01, BR-ERR-03, BR-ERR-04 |
| Q11 | A | BR-ERR-01, BR-ERR-02, tabela de textos |
| Q12 | A | BR-CTX-01 a BR-CTX-03 |
| Q13 | A | BR-ERR-06 |
| Q14 | A | BR-CNV-12, BR-CNV-13 |
| Q15 | A | BR-UI-05, BR-UI-06 |
| Q16 | A | BR-PER-07 |
| Q17 | A | BR-UI-01 |
