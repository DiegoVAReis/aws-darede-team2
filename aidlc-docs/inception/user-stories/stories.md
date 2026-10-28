# User Stories: Assistente de Conhecimento Interno da Anyone Agro Business

**Fontes:** `requirements.md`, `story-generation-plan.md` (Parte D) e `personas.md`.
**Formato:** "Como [persona], quero [ação], para [benefício]", com critérios de aceitação em Dado/Quando/Então. Os cenários de erro e de borda estão dentro dos critérios de cada história.
**Prioridade:** o número da história indica a ordem de implementação sugerida, respeitando as dependências. As histórias de F4 (interface) dependem das de F2 e F3 (API).
**Total:** 17 histórias em 5 grupos de funcionalidades.
**Escopo das histórias técnicas:** não há histórias técnicas. Sessões em memória, configuração de ambiente e fixação de dependências ficam nos requisitos FR e NFR. As histórias US-16 e US-17 (grupo F5) descrevem resultados de uso para o Mantenedor: subir o assistente seguindo o README e ter uma documentação sem segredos.

## Índice

| Ordem | ID | Título | Grupo | Persona |
|---|---|---|---|---|
| 1 | US-01 | Indexar a base de conhecimento | F1 | Marcos |
| 2 | US-02 | Reindexar sem duplicar | F1 | Marcos |
| 3 | US-03 | Saber se a base está indexada | F1 | Marcos |
| 4 | US-04 | Receber resposta fundamentada na base | F2 | Carla |
| 5 | US-05 | Receber as fontes da resposta | F2 | Carla |
| 6 | US-06 | Ser avisado quando a base não tem a informação | F2 | Seu Altair |
| 7 | US-07 | Receber a resposta no idioma da pergunta | F2 | Seu Altair |
| 8 | US-08 | Fazer perguntas de acompanhamento | F3 | Carla |
| 9 | US-09 | Manter conversas independentes | F3 | Seu Altair |
| 10 | US-10 | Ser avisado quando o contexto foi reiniciado | F3 | Carla |
| 11 | US-11 | Conversar em uma interface estilo chat | F4 | Carla |
| 12 | US-12 | Ver o título e o arquivo de cada fonte | F4 | Carla |
| 13 | US-13 | Começar por perguntas sugeridas | F4 | Seu Altair |
| 14 | US-14 | Gerenciar conversas na barra lateral | F4 | Carla |
| 15 | US-15 | Recuperar conversas ao recarregar a página | F4 | Seu Altair |
| 16 | US-16 | Subir o assistente localmente | F5 | Marcos |
| 17 | US-17 | Compartilhar a documentação sem expor segredos | F5 | Marcos |

---

# F1. Base de conhecimento

## US-01. Indexar a base de conhecimento
**Persona:** Marcos, o Mantenedor | **Ordem:** 1 | **Requisitos:** FR-01.1 a FR-01.5, FR-01.7, NFR-02, NFR-03, NFR-07

**Como** Mantenedor da base, **quero** executar um comando que indexe os documentos de `anyone_kb/`, **para** que o assistente consiga buscar e citar o conhecimento interno.

**Critérios de aceitação**

1. **Cenário: ingestão completa**
   - Dado que o `.env` está válido e `anyone_kb/` contém os 15 documentos `.md`
   - Quando eu executo o comando de ingestão
   - Então todos os documentos são lidos, divididos em chunks de cerca de 500 tokens com sobreposição de 50, e seus embeddings são gerados com `amazon.titan-embed-text-v2:0`
   - E os chunks são gravados na coleção `anyone` em `backend/chroma_store/`
   - E o comando mostra a quantidade de chunks indexados.
2. **Cenário: metadados para citação**
   - Dado que a ingestão terminou
   - Quando eu inspeciono um chunk gravado
   - Então ele guarda o nome do arquivo de origem em `source` e o título H1 do documento em `title`.
3. **Cenário: pasta sem documentos**
   - Dado que `anyone_kb/` não existe ou não contém arquivos `.md`
   - Quando eu executo a ingestão
   - Então recebo uma mensagem clara explicando o problema
   - E nenhum dado é alterado na coleção.
4. **Cenário: falha ao chamar o Bedrock**
   - Dado que a chamada ao Bedrock falha durante a ingestão (por exemplo, chave inválida ou expirada)
   - Quando a ingestão encontra o erro
   - Então o comando termina com uma mensagem de erro compreensível
   - E a API Key não aparece na saída nem nos logs.

---

## US-02. Reindexar sem duplicar
**Persona:** Marcos, o Mantenedor | **Ordem:** 2 | **Requisitos:** FR-01.4, FR-01.6

**Como** Mantenedor da base, **quero** rodar a ingestão mais de uma vez, **para** atualizar a base depois de editar documentos sem duplicar ou deixar lixo.

**Critérios de aceitação**

1. **Cenário: repetição sem mudanças**
   - Dado que a base já foi indexada
   - Quando eu executo a ingestão novamente sem alterar nenhum documento
   - Então a quantidade de chunks na coleção continua a mesma
   - E os ids seguem o padrão `{nome_do_arquivo_sem_extensão}-{índice}`.
2. **Cenário: documento alterado**
   - Dado que eu editei o conteúdo de um documento
   - Quando eu executo a ingestão
   - Então os chunks desse documento são atualizados com o novo conteúdo
   - E os chunks dos outros documentos permanecem inalterados.
3. **Cenário: documento que encolheu**
   - Dado que um documento ficou menor e passou a gerar menos chunks
   - Quando eu executo a ingestão
   - Então os chunks antigos desse documento que deixaram de existir são removidos da coleção.
4. **Cenário: documento novo**
   - Dado que adicionei um novo arquivo `.md` em `anyone_kb/`
   - Quando eu executo a ingestão
   - Então os chunks do novo documento são adicionados à coleção.

---

## US-03. Saber se a base está indexada
**Persona:** Marcos, o Mantenedor | **Ordem:** 3 | **Requisitos:** FR-01.7, FR-05.4 (`KB_NOT_INDEXED`)

**Como** Mantenedor da base, **quero** ser informado se a base está indexada, **para** corrigir o problema antes de o usuário final perguntar.

**Critérios de aceitação**

1. **Cenário: confirmação após a ingestão**
   - Dado que a ingestão terminou com sucesso
   - Quando eu leio a saída do comando
   - Então vejo o total de chunks indexados e o local da coleção.
2. **Cenário: pergunta antes da ingestão**
   - Dado que a ingestão nunca foi executada e a coleção `anyone` não existe
   - Quando um usuário envia uma pergunta ao assistente
   - Então a API responde com um erro no formato padrão e código `KB_NOT_INDEXED`
   - E a mensagem orienta a executar a ingestão primeiro
   - E nenhum detalhe interno ou segredo aparece na mensagem.

---

# F2. Perguntas e respostas com fontes

## US-04. Receber resposta fundamentada na base
**Persona:** Carla, a Colaboradora | **Ordem:** 4 | **Requisitos:** FR-02.1, FR-02.2, FR-03.1, FR-05.2, FR-05.3, FR-05.4, NFR-02, NFR-03, NFR-05

**Como** Colaboradora, **quero** fazer uma pergunta em linguagem natural e receber uma resposta baseada nos documentos internos, **para** resolver minha dúvida em minutos sem depender de colegas.

**Critérios de aceitação**

1. **Cenário: pergunta coberta pela base**
   - Dado que a base está indexada
   - Quando eu envio `POST /v1/ask` com `{ "text": "Qual a garantia padrão dos tratores?" }`
   - Então a resposta traz `answer` escrita em linguagem natural com base nos trechos recuperados (até 3 trechos)
   - E traz `session_id` e `session_reset: false`
   - E tudo vem em uma única resposta, sem streaming.
2. **Cenário: texto inválido**
   - Dado que o texto está vazio, tem apenas espaços ou excede o tamanho máximo permitido
   - Quando eu envio a pergunta
   - Então recebo erro de validação no formato `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`
   - E nenhuma chamada é feita ao Bedrock.
3. **Cenário: falha do Bedrock**
   - Dado que o Bedrock está indisponível ou rejeita a chamada
   - Quando eu envio uma pergunta
   - Então recebo um erro com código `UPSTREAM_ERROR` e uma mensagem compreensível
   - E a mensagem não expõe a API Key nem detalhes internos.
4. **Cenário: contrato da API**
   - Dado que a API está em execução
   - Quando eu consulto `GET /health`
   - Então recebo `{ "status": "ok" }`.

---

## US-05. Receber as fontes da resposta
**Persona:** Carla, a Colaboradora | **Ordem:** 5 | **Requisitos:** FR-02.4, FR-03.5, FR-05.2

**Como** Colaboradora, **quero** ver de quais documentos a resposta veio, **para** confiar nela e consultar a versão oficial.

**Critérios de aceitação**

1. **Cenário: fonte única**
   - Dado que a resposta usou trechos de `maquinas_agricolas_catalogo.md`
   - Quando eu recebo a resposta
   - Então `sources` contém um item com `file: "maquinas_agricolas_catalogo.md"` e `title` com o título H1 do documento.
2. **Cenário: várias fontes sem repetição**
   - Dado que a resposta usou dois trechos do mesmo arquivo e um trecho de outro arquivo
   - Quando eu recebo a resposta
   - Então `sources` lista cada arquivo uma única vez
   - E a ordem segue a relevância dos trechos.
3. **Cenário: fontes só do turno atual**
   - Dado que a conversa já teve respostas anteriores com outras fontes
   - Quando eu recebo a resposta do turno atual
   - Então `sources` contém apenas as fontes consultadas neste turno.

---

## US-06. Ser avisado quando a base não tem a informação
**Persona:** Seu Altair, o Cooperado | **Ordem:** 6 | **Requisitos:** FR-02.3, FR-03.3, FR-03.4, FR-06.8

**Como** Cooperado, **quero** que o assistente me diga quando a informação não está na base interna, **para** não tomar uma decisão achando que é regra oficial da empresa.

**Critérios de aceitação**

1. **Cenário: nenhum trecho dentro do limite de distância**
   - Dado que nenhum trecho recuperado está dentro do limite de distância configurado
   - Quando eu faço a pergunta
   - Então a resposta usa o conhecimento geral do modelo
   - E o texto deixa explícito que a informação não veio da base interna
   - E `sources` vem como lista vazia.
2. **Cenário: trechos recuperados, mas irrelevantes**
   - Dado que há trechos dentro do limite, mas o agente avalia que eles não respondem à pergunta
   - Quando o agente monta a resposta
   - Então ele aplica o mesmo aviso explícito e devolve `sources` vazio.
3. **Cenário: resposta com base**
   - Dado que os trechos recuperados respondem à pergunta
   - Quando recebo a resposta
   - Então o texto não traz o aviso de "fora da base"
   - E `sources` lista os documentos usados.
4. **Cenário: limite configurável**
   - Dado que o limite de distância é definido por variável de ambiente
   - Quando eu altero o valor e reinicio o backend
   - Então o novo limite passa a valer nas próximas perguntas.

---

## US-07. Receber a resposta no idioma da pergunta
**Persona:** Seu Altair, o Cooperado | **Ordem:** 7 | **Requisitos:** FR-03.2

**Como** Cooperado, **quero** receber a resposta no mesmo idioma em que perguntei, **para** entender sem esforço.

**Critérios de aceitação**

1. **Cenário: pergunta em português**
   - Dado que eu pergunto em português
   - Quando recebo a resposta
   - Então ela está em português.
2. **Cenário: pergunta em inglês**
   - Dado que eu pergunto em inglês sobre um tema da base escrita em português
   - Quando recebo a resposta
   - Então ela está em inglês
   - E as fontes continuam sendo os documentos originais.
3. **Cenário: troca de idioma na mesma conversa**
   - Dado que a conversa começou em português
   - Quando eu faço a próxima pergunta em inglês
   - Então a resposta segue o idioma da última pergunta.

---

# F3. Conversa com memória

## US-08. Fazer perguntas de acompanhamento
**Persona:** Carla, a Colaboradora | **Ordem:** 8 | **Requisitos:** FR-03.2, FR-03.5, FR-04.1, FR-04.2

**Como** Colaboradora, **quero** fazer perguntas curtas que dependem do que perguntei antes, **para** conversar de forma natural sem repetir o contexto.

**Critérios de aceitação**

1. **Cenário: acompanhamento com contexto**
   - Dado que perguntei "Qual a garantia padrão dos tratores?" e recebi a resposta
   - Quando pergunto na mesma sessão "e a das colheitadeiras?"
   - Então o agente entende que a pergunta é sobre garantia
   - E reescreve a consulta de busca com esse contexto antes de recuperar os trechos
   - E as fontes retornadas são as do novo turno.
2. **Cenário: janela de memória**
   - Dado que a conversa passou de 20 mensagens
   - Quando envio uma nova pergunta
   - Então apenas as 20 mensagens mais recentes fazem parte do contexto enviado ao modelo.
3. **Cenário: pergunta de acompanhamento sem contexto**
   - Dado que acabei de iniciar uma sessão nova
   - Quando envio "e a das colheitadeiras?"
   - Então o assistente pede mais detalhes ou responde com o que for possível, sem inventar contexto que não existe.

---

## US-09. Manter conversas independentes
**Persona:** Seu Altair, o Cooperado | **Ordem:** 9 | **Requisitos:** FR-04.1, FR-04.3, FR-04.4, FR-05.2

**Como** Cooperado, **quero** que cada conversa tenha seu próprio contexto, **para** perguntar sobre crédito em uma conversa e sobre máquinas em outra sem misturar os assuntos.

**Critérios de aceitação**

1. **Cenário: sem `session_id`**
   - Dado que envio uma pergunta sem `session_id`
   - Quando a API responde
   - Então ela cria uma sessão nova e devolve o `session_id` gerado.
2. **Cenário: sessões separadas**
   - Dado que existem duas sessões com `session_id` diferentes
   - Quando faço perguntas em cada uma
   - Então o contexto de uma não aparece na outra.
3. **Cenário: limite de sessões ativas**
   - Dado que o limite de sessões ativas em memória foi atingido
   - Quando uma nova sessão é criada
   - Então a sessão mais antiga é descartada
   - E a memória do backend não cresce além do limite.
4. **Cenário: chamadas simultâneas**
   - Dado que duas perguntas chegam ao mesmo tempo na mesma sessão
   - Quando o backend as processa
   - Então elas são executadas uma de cada vez, sem corromper o histórico da sessão.

---

## US-10. Ser avisado quando o contexto foi reiniciado
**Persona:** Carla, a Colaboradora | **Ordem:** 10 | **Requisitos:** FR-04.5, FR-06.7

**Como** Colaboradora, **quero** saber quando o assistente perdeu o contexto da conversa, **para** repetir a informação necessária em vez de achar que ele ainda lembra.

**Critérios de aceitação**

1. **Cenário: backend reiniciado**
   - Dado que a conversa tem um `session_id` e o backend foi reiniciado
   - Quando envio uma nova pergunta com esse `session_id`
   - Então a API cria uma sessão nova com o mesmo id
   - E responde com `session_reset: true`.
2. **Cenário: aviso na interface**
   - Dado que a resposta veio com `session_reset: true`
   - Quando a interface mostra a resposta
   - Então aparece um aviso discreto de que o contexto da conversa foi reiniciado
   - E as mensagens anteriores continuam visíveis na tela.
3. **Cenário: aviso apenas uma vez**
   - Dado que o aviso já foi mostrado
   - Quando envio a pergunta seguinte
   - Então a resposta vem com `session_reset: false`
   - E o aviso não aparece de novo.

---

# F4. Interface de chat

## US-11. Conversar em uma interface estilo chat
**Persona:** Carla, a Colaboradora | **Ordem:** 11 | **Requisitos:** FR-05.5, FR-06.1, FR-06.5, FR-06.9, FR-06.10

**Como** Colaboradora, **quero** uma interface de chat familiar, **para** perguntar e ler respostas com conforto, sem precisar aprender uma ferramenta nova.

**Critérios de aceitação**

1. **Cenário: enviar e ler mensagens**
   - Dado que abri o front-end em `http://localhost:5173`
   - Quando digito uma pergunta e pressiono Enter
   - Então minha mensagem aparece em uma bolha
   - E a resposta do assistente aparece em outra bolha, com Markdown renderizado (listas, negrito, tabelas).
2. **Cenário: quebra de linha**
   - Dado que estou digitando
   - Quando pressiono Shift+Enter
   - Então é inserida uma nova linha sem enviar a mensagem.
3. **Cenário: carregando**
   - Dado que enviei uma pergunta
   - Quando aguardo a resposta
   - Então vejo um indicador de carregamento
   - E não consigo enviar outra pergunta na mesma conversa até a resposta chegar.
4. **Cenário: erro**
   - Dado que a API devolveu um erro no formato padrão (por exemplo, `VALIDATION_ERROR`, `KB_NOT_INDEXED` ou `UPSTREAM_ERROR`)
   - Quando a interface recebe o erro
   - Então ela mostra uma mensagem amigável baseada no erro
   - E a conversa continua utilizável.
5. **Cenário: sem login e sem segredos**
   - Dado que abro o front-end
   - Quando uso o chat
   - Então não preciso de login nem de chave
   - E o front-end não contém nem exibe nenhuma credencial do Bedrock.
6. **Cenário: comunicação com a API local**
   - Dado que a API roda em `localhost:8000` com CORS liberado só para `http://localhost:5173`
   - Quando o front-end envia uma pergunta
   - Então a chamada é aceita pela API.
7. **Cenário: acessibilidade básica**
   - Dado que uso apenas o teclado
   - Quando navego pela tela
   - Então consigo chegar ao campo de entrada, ao botão de enviar e aos itens da barra lateral
   - E o foco é visível
   - E os controles têm rótulos acessíveis.

---

## US-12. Ver o título e o arquivo de cada fonte
**Persona:** Carla, a Colaboradora | **Ordem:** 12 | **Requisitos:** FR-06.6, FR-06.8

**Como** Colaboradora, **quero** ver, abaixo de cada resposta, o título do documento e o nome do arquivo, **para** saber exatamente onde conferir a informação.

**Critérios de aceitação**

1. **Cenário: fontes exibidas**
   - Dado que a resposta traz `sources` com itens `{file, title}`
   - Quando a interface mostra a resposta
   - Então abaixo dela aparece, para cada fonte, o título H1 do documento com o nome do arquivo em texto menor ao lado.
2. **Cenário: sem fontes**
   - Dado que `sources` vem vazio
   - Quando a interface mostra a resposta
   - Então nenhuma lista de fontes é exibida
   - E o aviso de que a informação não veio da base interna está no próprio texto da resposta.
3. **Cenário: várias fontes**
   - Dado que a resposta traz mais de uma fonte
   - Quando a interface mostra a resposta
   - Então todas aparecem na ordem recebida e sem repetição.

---

## US-13. Começar por perguntas sugeridas
**Persona:** Seu Altair, o Cooperado | **Ordem:** 13 | **Requisitos:** FR-06.4

**Como** Cooperado, **quero** ver sugestões de perguntas na tela inicial, **para** começar sem saber o que perguntar.

**Critérios de aceitação**

1. **Cenário: sugestões na tela inicial**
   - Dado que abri uma conversa nova, sem mensagens
   - Quando a tela é exibida
   - Então vejo sugestões de perguntas que representam temas da base (por exemplo, máquinas, crédito, seguros e onboarding).
2. **Cenário: enviar uma sugestão**
   - Dado que vejo as sugestões
   - Quando clico em uma delas
   - Então a pergunta é enviada como mensagem na conversa atual
   - E a resposta aparece como em qualquer outra pergunta.
3. **Cenário: sugestões somem após a primeira mensagem**
   - Dado que a conversa já tem mensagens
   - Quando a tela é exibida
   - Então as sugestões não aparecem.

---

## US-14. Gerenciar conversas na barra lateral
**Persona:** Carla, a Colaboradora | **Ordem:** 14 | **Requisitos:** FR-06.2, FR-06.3, FR-04.1

**Como** Colaboradora, **quero** uma barra lateral com minhas conversas, **para** alternar entre assuntos, renomear e apagar conversas.

**Critérios de aceitação**

1. **Cenário: nova conversa**
   - Dado que estou em uma conversa
   - Quando clico em "Nova conversa"
   - Então uma conversa vazia é criada e selecionada, com um novo `session_id`
   - E ela aparece na barra lateral.
2. **Cenário: alternar entre conversas**
   - Dado que tenho duas ou mais conversas
   - Quando clico em outra conversa na barra lateral
   - Então vejo as mensagens dela
   - E as próximas perguntas usam o `session_id` dessa conversa.
3. **Cenário: renomear**
   - Dado que uma conversa tem um título padrão
   - Quando eu a renomeio
   - Então o novo título aparece na barra lateral e é mantido depois de recarregar a página.
4. **Cenário: excluir**
   - Dado que tenho uma conversa que não quero mais
   - Quando a excluo
   - Então ela some da barra lateral e do armazenamento do navegador
   - E se era a conversa atual, a interface seleciona outra conversa ou abre uma nova vazia.

---

## US-15. Recuperar conversas ao recarregar a página
**Persona:** Seu Altair, o Cooperado | **Ordem:** 15 | **Requisitos:** FR-06.3, FR-04.5

**Como** Cooperado, **quero** que minhas conversas continuem na tela quando eu recarregar a página, **para** não perder o que já perguntei.

**Critérios de aceitação**

1. **Cenário: recarregar a página**
   - Dado que tenho conversas com mensagens e fontes
   - Quando recarrego a página ou fecho e reabro o navegador
   - Então as conversas, as mensagens, as fontes exibidas e os títulos continuam disponíveis
   - E cada conversa mantém o seu `session_id`.
2. **Cenário: continuar a conversa com o backend ativo**
   - Dado que o backend não foi reiniciado
   - Quando envio uma nova pergunta em uma conversa recuperada
   - Então a resposta considera o contexto anterior da conversa.
3. **Cenário: continuar a conversa após reinício do backend**
   - Dado que o backend foi reiniciado enquanto a página estava fechada
   - Quando envio uma nova pergunta em uma conversa recuperada
   - Então a interface mostra o aviso de contexto reiniciado (US-10)
   - E o histórico exibido continua intacto.
4. **Cenário: armazenamento indisponível ou corrompido**
   - Dado que os dados guardados no navegador estão ilegíveis
   - Quando abro a página
   - Então a interface inicia com uma conversa vazia, sem travar.

---

# F5. Entrega e uso local

## US-16. Subir o assistente localmente
**Persona:** Marcos, o Mantenedor | **Ordem:** 16 | **Requisitos:** FR-05.1, FR-05.6, FR-07.1, NFR-01, NFR-02, NFR-07

**Como** Mantenedor da base, **quero** subir ingestão, backend e front seguindo o README, **para** ter o assistente funcionando na minha máquina em poucos comandos.

**Critérios de aceitação**

1. **Cenário: seguir o README do zero**
   - Dado que tenho Python 3.11+, `uv`, Node.js e `npm`, e o `.env` do facilitador está na raiz do projeto
   - Quando sigo o README (instalar dependências, executar a ingestão, subir o backend na porta 8000 com 1 worker e o front na porta 5173)
   - Então abro `http://localhost:5173` e consigo fazer uma pergunta e receber uma resposta com fontes.
2. **Cenário: verificação de saúde**
   - Dado que o backend subiu
   - Quando consulto `GET /health`
   - Então recebo `{ "status": "ok" }`.
3. **Cenário: variáveis de ambiente ausentes**
   - Dado que o `.env` não existe ou falta alguma variável obrigatória (`AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID`, `BEDROCK_EMBED_MODEL_ID`)
   - Quando o backend ou a ingestão inicia
   - Então recebo uma mensagem clara com os nomes das variáveis que faltam
   - E nenhum valor de variável é impresso.
4. **Cenário: logs sem segredos**
   - Dado que o backend está em execução
   - Quando observo o console
   - Então vejo logs simples de início, ingestão e erros
   - E o Bearer token nunca aparece.
5. **Cenário: comandos de qualidade**
   - Dado que o projeto está instalado
   - Quando executo os comandos documentados de testes e `ruff`
   - Então os testes do backend (pytest) e do front (Vitest) e a verificação de lint rodam a partir do README.

---

## US-17. Compartilhar a documentação sem expor segredos
**Persona:** Marcos, o Mantenedor | **Ordem:** 17 | **Requisitos:** FR-07.1, FR-07.2, NFR-03

**Como** Mantenedor da base, **quero** um README que explique o uso do `.env` sem revelar nenhum segredo, **para** compartilhar o repositório com segurança.

**Critérios de aceitação**

1. **Cenário: variáveis documentadas sem valores secretos**
   - Dado que leio a seção sobre o `.env` no README
   - Quando vejo as variáveis esperadas
   - Então encontro os nomes de `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID` e `BEDROCK_EMBED_MODEL_ID`
   - E apenas valores não sensíveis (região e IDs dos modelos), sem a API Key nem qualquer valor secreto.
2. **Cenário: sem `.env.example`**
   - Dado que inspeciono o repositório
   - Quando procuro arquivos de exemplo de ambiente
   - Então não existe `.env.example`
   - E o README explica que o `.env` é entregue pelo facilitador e colocado na raiz.
3. **Cenário: `.env` fora do versionamento**
   - Dado que executo `git status` com o `.env` presente
   - Quando verifico os arquivos a serem versionados
   - Então o `.env` não aparece, pois está coberto pelo `.gitignore`.
4. **Cenário: README completo**
   - Dado que abro o README
   - Quando percorro suas seções
   - Então encontro pré-requisitos, preparo do `.env`, instalação, ingestão, execução do backend e do front, e comandos de teste e lint.

---

# Matriz de rastreabilidade: requisitos x histórias

| Requisito | Histórias |
|---|---|
| FR-01 Ingestão | US-01, US-02, US-03 |
| FR-02 Recuperação | US-04, US-05, US-06 |
| FR-03 Agente | US-04, US-06, US-07, US-08, US-05 (FR-03.5) |
| FR-04 Sessões | US-08, US-09, US-10, US-14, US-15, US-16 (1 worker) |
| FR-05 API | US-03, US-04, US-05, US-09, US-11 (CORS), US-16 (`/health`, `.env`) |
| FR-06 Front-end | US-10, US-11, US-12, US-13, US-14, US-15 |
| FR-07 Documentação | US-16, US-17 |
| NFR-01 Execução e ambiente | US-16 |
| NFR-02 Bedrock | US-01, US-04, US-16 |
| NFR-03 Segurança básica | US-01, US-03, US-04, US-11, US-17 |
| NFR-04 Bibliotecas | Transversal (decisão técnica, sem história própria) |
| NFR-05 Desempenho e disponibilidade | US-04 (`UPSTREAM_ERROR`) |
| NFR-06 Testabilidade | Transversal: os critérios Dado/Quando/Então são a base dos testes baseados em exemplo (PBT-10); as propriedades serão identificadas no Functional Design |
| NFR-07 Observabilidade mínima | US-01, US-16 |

## Cobertura por requisito funcional

| Requisito | Coberto por |
|---|---|
| FR-01.1 a FR-01.7 | US-01, US-02, US-03 |
| FR-02.1 a FR-02.4 | US-04, US-05, US-06 |
| FR-03.1 a FR-03.5 | US-04, US-05, US-06, US-07, US-08 |
| FR-04.1 a FR-04.6 | US-08, US-09, US-10, US-14, US-15, US-16 (1 worker) |
| FR-05.1 a FR-05.6 | US-03, US-04, US-05, US-09, US-11, US-16 |
| FR-06.1 a FR-06.10 | US-10, US-11, US-12, US-13, US-14, US-15 |
| FR-07.1 e FR-07.2 | US-16, US-17 |

## Mapa de personas x histórias

| Persona | Histórias principais |
|---|---|
| Carla, a Colaboradora | US-04, US-05, US-08, US-10, US-11, US-12, US-14 |
| Seu Altair, o Cooperado | US-06, US-07, US-09, US-13, US-15 |
| Marcos, o Mantenedor da base | US-01, US-02, US-03, US-16, US-17 |

Carla e Seu Altair usam a mesma interface, então todas as histórias de US-04 a US-15 valem para as duas personas. A tabela indica apenas a persona que melhor representa cada história.

## Verificação INVEST (resumo)

- **Independentes:** cada história entrega um resultado verificável por si. As dependências de ordem estão no índice.
- **Negociáveis:** os critérios descrevem o comportamento, não a implementação.
- **Valiosas:** todas têm benefício explícito para uma persona.
- **Estimáveis e pequenas:** 17 histórias de tamanho médio, de acordo com a granularidade escolhida.
- **Testáveis:** todas têm critérios em Dado/Quando/Então, incluindo erros e bordas.
