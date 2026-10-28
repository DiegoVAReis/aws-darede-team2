# Assistente de Conhecimento Interno da Anyone Agro Business

Chatbot RAG local que responde perguntas sobre procedimentos, normas, catálogos e políticas internas da Anyone Agro Business (empresa fictícia, projeto didático) e **cita o documento de origem** de cada resposta.

- **Backend (pronto):** Python 3.11+, FastAPI, Strands Agents, ChromaDB, Amazon Nova Pro e Titan Embeddings v2 via Amazon Bedrock.
- **Frontend (pendente):** React 18 + Vite + TypeScript, estilo ChatGPT. Ainda não foi gerado (Unidade 2).
- **Base de conhecimento:** 15 documentos Markdown em `anyone_kb/`.
- **Execução:** totalmente local. Nenhum serviço de hospedagem na AWS; só o Bedrock é chamado.

## Estado atual do projeto

| Item | Situação |
|---|---|
| Inception (requisitos, histórias, design, unidades) | Concluída |
| Backend: código e testes | Gerado. 144 testes passaram, cobertura de 98% (Bedrock simulado) |
| Backend: execução com o Bedrock real, calibração do limite de distância | **Pendente** (ver "Verificação com o Bedrock real") |
| Frontend | **Pendente** (Functional Design, NFR, código) |
| Build and Test integrado, README final | Pendente |

O estado detalhado e o histórico de decisões estão em `aidlc-docs/` (ver "Como retomar o trabalho").

## Pré-requisitos

| Ferramenta | Versão | Conferir no PowerShell |
|---|---|---|
| Python | 3.11 ou superior (testado com 3.13.5) | `python --version` |
| pip | qualquer recente | `python -m pip --version` |
| Git | qualquer recente | `git --version` |
| Node.js e npm | 18 ou superior (só para o Frontend) | `node --version; npm --version` |
| `uv` | **opcional** | `uv --version` |

Também é preciso de **internet** na primeira execução: o `tiktoken` baixa o vocabulário `cl100k_base` na primeira vez que conta tokens (ingestão e testes de chunking).

## Configuração do PowerShell (uma vez por máquina)

Não é necessário ativar o ambiente virtual: todos os comandos abaixo chamam o `python.exe` do `.venv` diretamente, o que evita problemas com a política de execução do PowerShell.

Se você preferir ativar o venv (`.\.venv\Scripts\Activate.ps1`) e receber o erro "a execução de scripts foi desabilitada neste sistema", libere para o seu usuário:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Para ver acentos corretamente na saída do terminal:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8
```

## Arquivo `.env` (segredos)

O `.env` fica **na raiz do projeto** (`C:\Workshop\rag-agent-chatbot-v2\.env`) e é fornecido pelo facilitador. Ele **nunca** vai para o Git (já está no `.gitignore`). Não existe `.env.example` neste repositório por decisão de projeto (FR-07.2).

Variáveis obrigatórias (só os nomes; os valores vêm do facilitador):

| Variável | Valor de referência | Observação |
|---|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | (segredo) | Amazon Bedrock API Key. Reconhecida automaticamente pelo `boto3` >= 1.39 |
| `AWS_REGION` | `us-east-1` | |
| `BEDROCK_MODEL_ID` | `amazon.nova-pro-v1:0` | Se a chamada direta falhar na sua conta, use `us.amazon.nova-pro-v1:0` |
| `BEDROCK_EMBED_MODEL_ID` | `amazon.titan-embed-text-v2:0` | |

Variáveis opcionais de ajuste (já têm padrão; só coloque no `.env` se quiser mudar):

| Variável | Padrão | Efeito |
|---|---|---|
| `RETRIEVAL_TOP_K` | `3` | Trechos recuperados por pergunta |
| `RETRIEVAL_MAX_DISTANCE` | `0.6` | Distância de cosseno máxima para um trecho ser relevante. Menor = mais restritivo |
| `CHUNK_SIZE`, `CHUNK_OVERLAP` | `500`, `50` | Tokens por chunk e sobreposição (reindexar após mudar) |
| `SESSION_WINDOW` | `20` | Mensagens mantidas por conversa |
| `SESSION_MAX_COUNT` | `50` | Sessões ativas em memória |
| `ASK_MAX_TEXT_CHARS` | `2000` | Tamanho máximo da pergunta |
| `BEDROCK_READ_TIMEOUT` | `60` | Tempo limite por chamada ao Bedrock, em segundos |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens permitidas, separadas por vírgula |
| `KB_DIR`, `CHROMA_DIR`, `CHROMA_COLLECTION` | `anyone_kb/`, `backend/chroma_store/`, `anyone` | Caminhos relativos partem da raiz do projeto |

## Instalação do Backend

**Todos os comandos do Backend rodam dentro de `backend/`**, onde está o `pyproject.toml`. Rodar da raiz do projeto causa o erro `does not appear to be a Python project`.

```powershell
cd C:\Workshop\rag-agent-chatbot-v2\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

Com `uv` (opcional): `pip install uv`, depois `uv sync --extra dev` e `uv run <comando>`.

## Testes e qualidade

```powershell
cd C:\Workshop\rag-agent-chatbot-v2\backend
.\.venv\Scripts\python.exe -m pytest --cov              # testes + cobertura (mínimo 80%)
.\.venv\Scripts\python.exe -m ruff format .             # formata
.\.venv\Scripts\python.exe -m ruff check .              # lint
```

Os testes não chamam a AWS (Bedrock sempre simulado). Os testes de propriedades usam Hypothesis; para repetir uma falha, rode `pytest --hypothesis-seed=<N>` com o número que o Hypothesis imprimir.

## Execução

### 1. Indexar a base de conhecimento (uma vez, e de novo quando `anyone_kb/` mudar)

```powershell
cd C:\Workshop\rag-agent-chatbot-v2\backend
.\.venv\Scripts\python.exe ingest.py
```

Saída esperada: `Documentos lidos: 15 | chunks gravados: N | chunks removidos: 0 | total na colecao: N`. É idempotente: rodar de novo não duplica nada. Se algum documento falhar, o comando termina com código 1 e lista os arquivos; rode novamente.

### 2. Subir a API

```powershell
cd C:\Workshop\rag-agent-chatbot-v2\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

Use **1 worker** (não passe `--workers`): as sessões de conversa ficam em memória do processo. Porta ocupada? Troque `--port` e ajuste `VITE_API_BASE_URL` no Frontend.

### 3. Testar a API

Em outro terminal, carregue o atalho `Ask` (envia UTF-8 e mostra o corpo dos erros):

```powershell
cd C:\Workshop\rag-agent-chatbot-v2\backend
. .\scripts\ask.ps1

Test-Health                                              # {status: ok}
$r = Ask "Qual a garantia padrão dos tratores?"
$r | ConvertTo-Json -Depth 5                             # answer, sources, session_id, session_reset
Ask "E as colheitadeiras, quais modelos existem?" $r.session_id   # pergunta de acompanhamento
```

Contrato resumido de `POST /v1/ask`:
- Requisição: `{ "text": "...", "session_id": "opcional" }`
- Resposta: `{ "answer": "...", "sources": [{ "file": "...", "title": "..." }], "session_id": "...", "session_reset": false }`
- Erros: `{ "error": { "code": "...", "message": "..." } }` com `VALIDATION_ERROR` (422), `KB_NOT_INDEXED` (503), `UPSTREAM_ERROR` (502) e `INTERNAL_ERROR` (500).

## Verificação com o Bedrock real (pendente)

Resultados esperados para fechar o Backend:

| Teste | Esperado |
|---|---|
| `Ask "Qual a garantia padrão dos tratores?"` | 12 meses ou 1.200 horas; fonte `maquinas_agricolas_catalogo.md` |
| Pergunta de acompanhamento na mesma sessão | Responde pelo contexto; `session_reset` falso |
| `Ask "Qual a receita de bolo de cenoura?"` | Aviso de que não veio da base interna; `sources` vazio |
| `Ask "What is the standard warranty for tractors?"` | Resposta em inglês, com fonte |
| `Ask "   "` ou `session_id` inválido | `VALIDATION_ERROR` |
| Reiniciar o servidor e reenviar o mesmo `session_id` | `session_reset` verdadeiro |
| Perguntas legítimas redigidas de outra forma | Com fonte. Se vierem como "fora da base", reduzir a restrição: aumentar `RETRIEVAL_MAX_DISTANCE` |

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `does not appear to be a Python project` | Comando rodado fora de `backend/`. Use `cd backend` |
| `No module named pytest` ou `ruff` | Instalação do `.[dev]` não concluiu ou foi feita em outro venv |
| `Variaveis obrigatorias ausentes no .env` | `.env` ausente na raiz ou sem `AWS_BEARER_TOKEN_BEDROCK` |
| `UPSTREAM_ERROR` em toda pergunta | Chave inválida, modelo sem acesso na conta ou sem internet. Tente `us.amazon.nova-pro-v1:0` |
| `KB_NOT_INDEXED` (503) | Falta rodar `ingest.py` |
| Primeira execução lenta ou erro de rede | Download do vocabulário do `tiktoken` |
| Acentos quebrados na resposta | Use o atalho `Ask` e configure o UTF-8 do console (ver acima) |
| Todas as respostas dizem "não veio da base interna" | Limite de distância restritivo: aumente `RETRIEVAL_MAX_DISTANCE` e reinicie o servidor |

## Estrutura do repositório

```
.env                         segredos (fora do Git; fornecido pelo facilitador)
anyone_kb/                   15 documentos da base de conhecimento
backend/                     API, ingestão, RAG, agente, sessões e testes
  scripts/ask.ps1            atalho para testar a API no PowerShell
  tests/                     testes de exemplo, de propriedades e de integração
  chroma_store/              índice local (gerado pela ingestão; fora do Git)
frontend/                    (a criar na Unidade 2)
aidlc-docs/                  documentação do processo AI-DLC (requisitos, design, planos, auditoria)
vision.md, tech-env.md       visão do projeto e ambiente técnico
.kiro/                       regras do AI-DLC (v1.0.1) para o Kiro
```

## Como retomar o trabalho (próximo desenvolvedor)

O projeto segue o **AI-DLC** com o Kiro. Para continuar:

1. Leia `aidlc-docs/aidlc-state.md`: mostra a fase, a etapa atual, o que está concluído e o próximo passo.
2. Leia `aidlc-docs/audit.md` (de baixo para cima) para ver o histórico de decisões e aprovações.
3. Documentos principais:
   - Requisitos: `aidlc-docs/inception/requirements/requirements.md`
   - Histórias: `aidlc-docs/inception/user-stories/stories.md`
   - Design e unidades: `aidlc-docs/inception/application-design/` (inclui o contrato HTTP v1 em `unit-of-work-dependency.md`)
   - Backend: `aidlc-docs/construction/backend/` (design funcional, NFR, resumo do código)
4. Abra a pasta no Kiro (em modo Vibe) e peça para continuar o AI-DLC. As regras em `.kiro/steering/aws-aidlc-rules/core-workflow.md` conduzem o fluxo.
5. **Próxima etapa:** Unidade 2 (Frontend): Functional Design, NFR Requirements e Code Generation. Depois: Build and Test integrado e este README final.

Decisões já tomadas que valem para quem continuar: sem streaming, uma resposta JSON por pergunta; memória de conversa por `session_id` (20 mensagens, 50 sessões); se a base não responde, o agente responde com conhecimento geral e avisa; extensões Security e Resiliency desativadas, Property-Based Testing no modo Parcial.
