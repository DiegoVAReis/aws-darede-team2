# Documento de Requisitos: Assistente de Conhecimento Interno da Anyone Agro Business

## 1. Resumo da Análise de Intenção

| Item | Valor |
|---|---|
| Pedido do usuário | Implementar, usando o AI-DLC, os planos de `vision.md` e `tech-env.md` |
| Tipo de pedido | Novo projeto (greenfield) |
| Escopo estimado | Múltiplos componentes (backend Python, front-end React, base de conhecimento local, integração com Bedrock) |
| Complexidade estimada | Moderada |
| Clareza do pedido | Clara (documentos de entrada detalhados) |
| Profundidade da análise | Standard, com rastreabilidade às respostas do usuário |
| Fontes | `vision.md`, `tech-env.md`, `requirement-verification-questions.md`, `requirement-clarification-questions.md` |

**Resumo:** chatbot RAG local que responde perguntas sobre o conhecimento interno da Anyone Agro Business (15 documentos em `anyone_kb/`), cita a origem de cada resposta e mantém o contexto da conversa. Backend em Python (FastAPI + Strands Agents + ChromaDB), front-end em React no estilo ChatGPT, modelos Amazon Nova Pro e Titan Embeddings v2 via Amazon Bedrock com API Key compartilhada.

## 2. Objetivo e Critério de Sucesso

- **Objetivo:** reduzir o tempo de busca de informação interna de horas, espalhadas em várias fontes, para minutos em uma única interface, sempre com a fonte citada.
- **Critério de sucesso (workshop):** solução local operante, demonstrada ao vivo, respondendo com base na base curada e citando a fonte.
- **Usuários:** colaborador (novo ou de outra área) e cooperado. Uso individual, sem autenticação.

## 3. Requisitos Funcionais

### FR-01 Ingestão da base de conhecimento
- FR-01.1 Ler todos os arquivos `*.md` de `anyone_kb/` (UTF-8).
- FR-01.2 Dividir cada documento em chunks de cerca de 500 tokens com sobreposição de 50 tokens, contando tokens de verdade com `tiktoken` (`cl100k_base`) como aproximação.
- FR-01.3 Gerar o embedding de cada chunk com `amazon.titan-embed-text-v2:0`.
- FR-01.4 Gravar no ChromaDB local (`PersistentClient` em `backend/chroma_store/`, coleção `anyone`) usando `upsert` com id determinístico `{nome_do_arquivo_sem_extensão}-{índice}`.
- FR-01.5 Cada chunk guarda nos metadados: `source` (nome do arquivo) e `title` (título H1 do documento).
- FR-01.6 A ingestão é idempotente: rodar mais de uma vez não duplica chunks. Ao reindexar um documento, remover os chunks antigos dele que deixaram de existir (por exemplo, quando o documento encolheu).
- FR-01.7 A ingestão é um passo offline, executado por comando (`python -m` ou script via `uv run`), e imprime a quantidade de chunks indexados.

### FR-02 Recuperação (RAG)
- FR-02.1 `retrieve(question, top_k=3)` gera o embedding da pergunta e consulta o ChromaDB.
- FR-02.2 Cada resultado traz trecho, `source`, `title` e distância.
- FR-02.3 Resultados com distância acima de um limite configurável (variável de ambiente) são descartados. Se nada sobra, `retrieve` informa que não há trecho relevante.
- FR-02.4 As fontes devolvidas são deduplicadas por arquivo, preservando a ordem de relevância.

### FR-03 Agente
- FR-03.1 Agente Strands Agents com `amazon.nova-pro-v1:0` (Bedrock) e `retrieve` exposta como tool.
- FR-03.2 O prompt de sistema orienta o agente a: (a) reescrever perguntas de acompanhamento ("e a garantia?") em consultas completas antes de chamar `retrieve`; (b) responder no mesmo idioma da pergunta do usuário; (c) basear a resposta apenas nos trechos quando eles forem relevantes.
- FR-03.3 **Sem informação relevante:** quando não há trecho relevante, o agente responde com conhecimento geral do modelo e deixa explícito, na própria resposta, que a informação não veio da base interna. Nesse caso `sources` é uma lista vazia.
- FR-03.4 A decisão de relevância é combinada: o limite de distância (FR-02.3) filtra primeiro e o agente decide por último se os trechos restantes respondem à pergunta.
- FR-03.5 As fontes de cada resposta vêm apenas das chamadas a `retrieve` do turno atual, nunca do histórico.

### FR-04 Memória de conversa (sessões)
- FR-04.1 O contexto da conversa fica na memória do backend (processo único), com um agente por sessão, identificada por `session_id`.
- FR-04.2 Janela deslizante de **20 mensagens** por sessão (cerca de 10 turnos).
- FR-04.3 Limite de sessões ativas em memória, descartando a mais antiga quando excedido (valor definido no design).
- FR-04.4 Trava por sessão: chamadas simultâneas na mesma sessão são serializadas.
- FR-04.5 Quando o backend recebe um `session_id` desconhecido (por exemplo, após reinício), ele cria uma sessão nova com esse mesmo id e responde com `session_reset: true`.
- FR-04.6 O backend deve rodar com 1 worker.

### FR-05 API HTTP (FastAPI)
- FR-05.1 `GET /health` retorna `{ "status": "ok" }`.
- FR-05.2 `POST /v1/ask`:
  - Requisição: `{ "text": "...", "session_id": "..." }`, onde `session_id` é opcional. Sem ele, o backend cria uma sessão.
  - Resposta: `{ "answer": "...", "sources": [ { "file": "...", "title": "..." } ], "session_id": "...", "session_reset": false }`.
  - Resposta completa em uma única chamada, sem streaming.
- FR-05.3 Convenções: REST/JSON, prefixo `/v1`, campos em `snake_case`, modelos Pydantic 2.x.
- FR-05.4 Formato de erro: `{ "error": { "code": "...", "message": "..." } }`. Códigos mínimos: `VALIDATION_ERROR` (texto vazio, só espaços ou acima do tamanho máximo), `KB_NOT_INDEXED` (coleção inexistente) e `UPSTREAM_ERROR` (falha ao chamar o Bedrock).
- FR-05.5 CORS liberado apenas para `http://localhost:5173`. A API roda em `localhost:8000`.
- FR-05.6 O `.env` é carregado na inicialização com `python-dotenv`.

### FR-06 Front-end (React 18 + Vite + TypeScript, estilo ChatGPT)
- FR-06.1 Layout de chat: mensagens em bolhas, campo de entrada fixo no rodapé (Enter envia, Shift+Enter quebra linha) e respostas renderizadas em Markdown.
- FR-06.2 Barra lateral com a lista de conversas: criar, selecionar, renomear e excluir. Cada conversa tem seu `session_id`.
- FR-06.3 Conversas e mensagens persistidas no `localStorage`. Botão "Nova conversa" cria uma conversa e uma sessão novas.
- FR-06.4 Tela inicial com sugestões de perguntas, que enviam a pergunta ao clicar.
- FR-06.5 Estados de carregando e de erro visíveis, com mensagem amigável a partir do formato de erro da API.
- FR-06.6 Fontes exibidas abaixo da resposta: título H1 do documento, com o nome do arquivo em texto menor ao lado.
- FR-06.7 Quando a API devolve `session_reset: true`, exibir um aviso discreto de que o contexto da conversa foi reiniciado.
- FR-06.8 Quando `sources` vem vazio, a resposta aparece sem lista de fontes. O aviso de que não veio da base interna já faz parte do texto da resposta (FR-03.3).
- FR-06.9 O front não guarda segredos nem acessa o Bedrock. Ele só conversa com a API local.
- FR-06.10 Acessibilidade básica: elementos semânticos, rótulos nos controles, foco visível e navegação por teclado.

### FR-07 Documentação e entrega
- FR-07.1 `README.md` com pré-requisitos, preparo do `.env`, instalação, ingestão, execução do backend e do front, e comandos de teste e lint.
- FR-07.2 A documentação do `.env` lista apenas os **nomes** das variáveis e valores de exemplo não sensíveis (região e IDs de modelo). Nunca inclui a API Key nem qualquer valor secreto. Não será gerado `.env.example`.

## 4. Requisitos Não Funcionais

### NFR-01 Execução e ambiente
- Execução totalmente local. Nenhum serviço de hospedagem ou computação remota (EC2, ECS, Lambda, API Gateway, S3, OpenSearch, Kendra).
- Python 3.11+, TypeScript 5.x, React 18.x com Vite. Backend gerenciado com `uv` e `pyproject.toml`. Front gerenciado com `npm`.
- Linguagens de backend diferentes de Python são proibidas.

### NFR-02 Integração com o Bedrock
- Autenticação por `AWS_BEARER_TOKEN_BEDROCK` com `boto3` >= 1.39. Não usar access key e secret.
- Variáveis esperadas: `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION=us-east-1`, `BEDROCK_MODEL_ID=amazon.nova-pro-v1:0`, `BEDROCK_EMBED_MODEL_ID=amazon.titan-embed-text-v2:0`.
- Modelos permitidos: apenas Nova Pro e Titan Embeddings v2.

### NFR-03 Segurança (checklist básico; extensão Security Baseline desativada)
- Validar a entrada da API (texto não vazio e tamanho máximo).
- Nunca commitar `.env` nem a API Key (`.gitignore` já cobre) e não registrar o Bearer token em logs.
- Nenhum segredo no front-end e nenhuma exposição de detalhes internos nas mensagens de erro.
- Dependências open source com licença permissiva (MIT, Apache ou BSD).
- Sem autenticação, pois é uma aplicação local de uso individual.

### NFR-04 Bibliotecas
- Obrigatórias: Strands Agents, FastAPI, Pydantic 2.x, ChromaDB, boto3 >= 1.39, uvicorn, python-dotenv, `tiktoken`.
- Proibidas: sentence-transformers, FAISS, Pinecone ou qualquer vector store gerenciado, LLMs premium.

### NFR-05 Desempenho e disponibilidade
- Sem metas formais (projeto didático). A experiência esperada é uma resposta completa por pergunta, com indicador de carregamento.
- Extensão Resiliency Baseline desativada. Os erros do Bedrock devem ser tratados com mensagem clara (`UPSTREAM_ERROR`), sem política de retentativa obrigatória.

### NFR-06 Testabilidade e qualidade
- **Backend:** pytest com cobertura mínima de 80%. Testes de unidade e um teste de integração do fluxo ingestão, recuperação e `/v1/ask` com o Bedrock mockado.
- **Front-end:** testes de componentes com Vitest e React Testing Library.
- **Lint e formatação:** `ruff` configurado no `pyproject.toml` e executado manualmente (sem pre-commit).
- **Testes baseados em propriedades (modo Parcial, framework Hypothesis no backend):** funções puras e round-trips de serialização. Candidatos:
  - O chunking nunca gera chunk acima do limite de tokens e preserva o conteúdo (invariantes).
  - A serialização dos modelos Pydantic de requisição e resposta faz round-trip sem perdas (PBT-02).
  - A deduplicação de fontes é idempotente e preserva a ordem (orientativo).
  - A extração do título H1 e a geração de ids determinísticos de chunk.
- Os geradores dos testes de propriedades devem produzir dados do domínio (PBT-07), com seed registrada em caso de falha (PBT-08). A escolha do framework deve constar nas decisões de tecnologia (PBT-09).
- Testes de segurança, desempenho e contrato: não exigidos.

### NFR-07 Observabilidade mínima
- Logs simples no console do backend (início, ingestão e erros), sem segredos.

## 5. Fora do Escopo

Integração com ERP ou CRM, sincronização automática da base, autenticação, multiusuário e perfis, deploy remoto ou em produção, base de conhecimento gerenciada, streaming de respostas, pre-commit hooks, `.env.example` e teste de integração real contra o Bedrock.

## 6. Configuração de Extensões

| Extensão | Habilitada | Observação |
|---|---|---|
| Security Baseline | Não | Regras SECURITY não aplicadas; vale o checklist básico do NFR-03 |
| Resiliency Baseline | Não | Regras de resiliência não aplicadas |
| Property-Based Testing | Sim (Parcial) | Bloqueantes: PBT-02, PBT-03, PBT-07, PBT-08, PBT-09. As demais são orientativas |

## 7. Desvios e Decisões Registradas

| Item | Documento base | Decisão do usuário | Efeito |
|---|---|---|---|
| Resposta final | `tech-env.md` concatenava trechos | Agente Strands com Nova Pro gera a resposta | Endpoint passa a usar o agente |
| Contrato de `/v1/ask` | `{text}` e `sources` como lista de textos | Acréscimo de `session_id` e `session_reset`; `sources` vira lista de objetos `{file, title}` | Contrato estendido |
| Ruff | Pre-commit bloqueante | Apenas comando manual | Sem `.pre-commit-config.yaml` |
| Chunking | Janelas de 500 palavras | Contagem real de tokens com `tiktoken` | Novo pacote permitido |
| Sem resposta na base | Não especificado | Conhecimento geral do modelo, com aviso explícito | Contrasta com a promessa de respostas sempre rastreáveis; o aviso mitiga |

## 8. Rastreabilidade das Respostas

| Pergunta | Resposta | Requisito |
|---|---|---|
| Q1 | A | FR-03.1, FR-05.2 |
| Q2 | B | FR-03.3, FR-06.8 |
| Q3 | B (mesmo idioma da pergunta) | FR-03.2 |
| Q4 | C com avaliação de impacto | FR-04 |
| Q5 | Estilo ChatGPT com A, B e C | FR-06.1 a FR-06.5 |
| Q6 | Cabeçalho do arquivo | FR-06.6 |
| Q7 | A | FR-05.2 |
| Q8 | B | FR-01.2 |
| Q9 | B | FR-01.4, FR-01.6 |
| Q10 | A | NFR-01 |
| Q11 | A | NFR-01 |
| Q12 | A | FR-05.5 |
| Q13 | B | NFR-06 |
| Q14 | B | NFR-06 |
| Q15 | A, sem expor segredos | FR-07 |
| Clarif. 1 | B | FR-04.5, FR-06.7 |
| Clarif. 2 | B | FR-04.2 |
| Clarif. 3 | B | FR-06.2, FR-06.3 |
| Clarif. 4 | A | FR-06.6 |
| Clarif. 5 | C | FR-02.3, FR-03.4 |
| Clarif. 6 | A | FR-01.2 |

## 9. Critérios de Aceitação

1. Depois de rodar a ingestão, a coleção `anyone` contém chunks dos 15 documentos, e uma segunda execução mantém a mesma contagem.
2. Uma pergunta coberta pela base (por exemplo, a garantia padrão dos tratores) retorna resposta fundamentada, com `sources` contendo o título e o arquivo do documento correspondente.
3. Uma pergunta de acompanhamento ("e a colheitadeira?") na mesma sessão é entendida pelo contexto e traz fontes do turno atual.
4. Uma pergunta fora da base retorna resposta com aviso explícito de que não veio da base interna e `sources` vazio.
5. Texto vazio em `/v1/ask` retorna HTTP 4xx com o formato de erro e o código `VALIDATION_ERROR`.
6. Após reiniciar o backend, a conversa continua na tela, e a próxima pergunta devolve `session_reset: true` e mostra o aviso.
7. A resposta no mesmo idioma da pergunta (português ou inglês).
8. A barra lateral permite criar, renomear, trocar e excluir conversas, e elas sobrevivem a um recarregamento da página.
9. `pytest` passa com cobertura de pelo menos 80% no backend, os testes do front passam e o `ruff` não aponta erros.
10. O repositório não contém `.env` nem a API Key, e o README não expõe segredos.

## 10. Pontos a Definir nas Próximas Etapas (design)

- Valor padrão do limite de distância do ChromaDB e nome da variável de ambiente.
- Limite de sessões ativas em memória, tamanho máximo do texto da pergunta e texto do prompt de sistema.
- Fixação de versões exatas das dependências. O `.gitignore` ignora `uv.lock`, então as versões devem ficar fixadas no `pyproject.toml`.
- Escolha do framework de testes de propriedades do front (fast-check) e dos geradores de domínio.

## 11. Premissas

- O facilitador entrega o `.env` com a API Key do Bedrock, e os participantes têm Python 3.11+, `uv`, Node.js e `npm`.
- Os 15 documentos de `anyone_kb/` já existem, são fictícios e sem dados pessoais.
- Uso individual, em uma única máquina, com 1 worker do backend.
