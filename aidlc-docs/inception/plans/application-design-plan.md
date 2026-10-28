# Plano de Application Design

Escopo: identificar componentes, assinaturas de métodos, camada de serviço e dependências das duas unidades planejadas (Backend e Frontend). As regras de negócio detalhadas ficam para o Functional Design.

Fontes: `requirements.md`, `stories.md`, `execution-plan.md`, `tech-env.md`.

## Pontos já fixados pelos requisitos (sem pergunta)

- Backend: ingestão, recuperação (`retrieve`), agente Strands com Nova Pro, sessões em memória (janela de 20 mensagens, limite de sessões, trava por sessão, `session_reset`) e API FastAPI (`GET /health`, `POST /v1/ask`).
- Frontend: React 18 + Vite + TypeScript, barra lateral de conversas, `localStorage`, Markdown, sugestões, fontes (título + arquivo) e aviso de contexto reiniciado.
- ChromaDB com coleção `anyone` em `backend/chroma_store/`, `PersistentClient`, ids `{arquivo}-{índice}` e metadados `source` e `title`.
- Chamadas ao front: `fetch` nativo, sem biblioteca extra de HTTP.

## Parte A. Perguntas de design

> Respostas preenchidas com as opcoes recomendadas (letra A em todas), a pedido do usuario ("Usa as recomendadas."), por serem as mais alinhadas ao `tech-env.md` e aos requisitos. O usuario pode pedir mudancas na aprovacao dos artefatos.

Responda preenchendo a letra após a tag `[Answer]:`. Se nenhuma opção servir, escolha a última (Other) e descreva. Evite combinar opções sem uma regra clara.

### Question 1 (organização do backend)
Como organizar os módulos Python do backend?

A) Layout plano em `backend/`, como no `tech-env.md` (`main.py`, `agent.py`, `rag.py`, `ingest.py`), mais módulos novos (`config.py`, `bedrock_client.py`, `chunking.py`, `sessions.py`, `schemas.py`, `errors.py`) e testes em `backend/tests/`

B) Pacote Python `backend/app/` com os mesmos módulos dentro dele (execução com `uvicorn app.main:app`) e testes em `backend/tests/`

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 2 (acesso ao Bedrock)
No exemplo do `tech-env.md`, o `rag.py` importa `embed` do `ingest.py`, o que acopla a recuperação à ingestão. Como tratar?

A) Um módulo compartilhado `bedrock_client.py` com o cliente `bedrock-runtime` e a função `embed()`, usado por `ingest.py` e `rag.py`; o agente usa o modelo do Strands configurado pelas mesmas variáveis de ambiente

B) Manter `embed()` dentro de `ingest.py`, como no exemplo, e importar de lá no `rag.py`

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 3 (camada de serviço)
Como a API chama o agente e as sessões?

A) Uma camada de serviço `AssistantService` com o método `ask(text, session_id)`, que orquestra sessão, agente e coleta de fontes; o endpoint só valida e converte a resposta

B) O endpoint chama diretamente o gerenciador de sessões e o agente, sem camada de serviço

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 4 (fontes de cada turno)
As fontes de cada resposta precisam vir só das buscas feitas no turno atual (US-05). Como capturá-las?

A) A tool `retrieve` registra seus resultados em um coletor criado a cada requisição; o serviço lê o coletor depois que o agente responde

B) Ler as chamadas e resultados da tool no histórico de mensagens do agente após cada turno

C) O próprio modelo lista as fontes na resposta estruturada (risco de o modelo inventar fontes)

D) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 5 (implementação das sessões)
Como implementar a memória por sessão?

A) Um agente Strands por sessão, com o gerenciador de conversa de janela deslizante do Strands (20 mensagens); o `SessionManager` guarda o dicionário de sessões, o limite com descarte da mais antiga e a trava por sessão

B) Agente sem estado; o `SessionManager` guarda o histórico e o envia a cada chamada, aplicando a janela de 20 mensagens por conta própria

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 6 (testabilidade e injeção de dependências)
Como isolar o Bedrock e o ChromaDB nos testes?

A) Injeção de dependências do FastAPI (`Depends`) para o serviço, o recuperador e o cliente do Bedrock; os testes substituem as dependências

B) Singletons no nível do módulo, substituídos com `unittest.mock.patch`, como no teste de exemplo do `tech-env.md`

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 7 (estado do front-end)
Como gerenciar o estado das conversas no React?

A) `useReducer` + Context do React, com uma camada de persistência no `localStorage`, sem biblioteca extra

B) Zustand com middleware de persistência

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 8 (renderização de Markdown)
A US-11 exige Markdown com listas, negrito e tabelas. Qual biblioteca usar?

A) `react-markdown` com `remark-gfm` (não renderiza HTML bruto por padrão)

B) `marked` com `DOMPurify` para sanitizar

C) Other (please describe after [Answer]: tag below)

[Answer]: A
### Question 9 (estilização do front-end)
Como estilizar a interface estilo ChatGPT?

A) CSS puro com CSS Modules e variáveis CSS, sem dependências extras

B) Tailwind CSS

C) Biblioteca de componentes (por exemplo, MUI)

D) Other (please describe after [Answer]: tag below)

[Answer]: A
## Parte B. Checklist de execução (após as respostas e a aprovação deste plano)

### Fase 1. Preparação
- [x] Reler `requirements.md`, `stories.md` e as respostas da Parte A
- [x] Analisar as respostas e resolver ambiguidades

### Fase 2. Artefatos
- [x] Gerar `aidlc-docs/inception/application-design/components.md` com definição, responsabilidades e interfaces dos componentes
- [x] Gerar `aidlc-docs/inception/application-design/component-methods.md` com assinaturas, propósito, entradas e saídas
- [x] Gerar `aidlc-docs/inception/application-design/services.md` com serviços e orquestração
- [x] Gerar `aidlc-docs/inception/application-design/component-dependency.md` com matriz de dependências, padrões de comunicação e fluxo de dados
- [x] Gerar `aidlc-docs/inception/application-design/application-design.md` consolidando os quatro documentos

### Fase 3. Validação
- [x] Verificar que cada requisito FR-01 a FR-07 e cada história US-01 a US-17 tem componente responsável
- [x] Verificar consistência entre componentes, métodos, serviços e dependências
- [x] Validar a sintaxe dos diagramas Mermaid e incluir alternativa em texto
- [x] Atualizar `aidlc-state.md` e registrar no `audit.md`
