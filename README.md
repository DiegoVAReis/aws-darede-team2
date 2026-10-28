# Assistente de Conhecimento Interno da Anyone Agro Business

Chatbot RAG local que responde perguntas sobre procedimentos, normas, catálogos e políticas internas da Anyone Agro Business (empresa fictícia, projeto didático) e **cita o documento de origem** de cada resposta.

- **Backend (pronto):** Python 3.11+, FastAPI, Strands Agents, ChromaDB, Amazon Nova Pro e Titan Embeddings v2 via Amazon Bedrock.
- **Frontend (pronto):** React 18 + Vite + TypeScript, estilo ChatGPT, com barra lateral de conversas guardadas no navegador.
- **Base de conhecimento:** 15 documentos Markdown em `anyone_kb/`.
- **Execução:** totalmente local. Nenhum serviço de hospedagem na AWS; só o Bedrock é chamado.

## Estado atual do projeto

| Item | Situação |
|---|---|
| Inception (requisitos, histórias, design, unidades) | Concluída |
| Backend: código e testes | Gerado. 144 testes passaram, cobertura de 98% (Bedrock simulado) |
| Backend: execução com o Bedrock real, calibração do limite de distância | **Pendente** (ver "Verificação com o Bedrock real") |
| Frontend: código e testes | Gerado. 187 testes passaram (exemplos, propriedades e telas), `tsc` e `vite build` sem erros |
| Frontend: uso com o Backend real | **Pendente** (ver "Verificação integrada") |
| Build and Test integrado, README final | Pendente |

O estado detalhado e o histórico de decisões estão em `aidlc-docs/` (ver "Como retomar o trabalho").

## Pré-requisitos

| Ferramenta | Versão | Conferir no PowerShell |
|---|---|---|
| Python | 3.11 ou superior (testado com 3.13.5) | `python --version` |
| pip | qualquer recente | `python -m pip --version` |
| Git | qualquer recente | `git --version` |
| Node.js e npm | Node `22.22.2` ou superior na linha 22, `24.15.0` ou superior na linha 24, ou `26+` (só para o Frontend; limite do Vitest 5 e do jsdom 30). Node 20 e 22 mais antigos não rodam os testes | `node --version; npm --version` |
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

### Atalho: subir Backend e Frontend juntos

Depois de instalar o Backend e o Frontend (seções "Instalação"), o `start.ps1` da raiz abre uma janela para cada serviço, espera os dois responderem e abre o navegador em `http://localhost:5173`:

```powershell
.\start.ps1               # sobe os dois
.\start.ps1 -Ingest       # indexa a base antes de subir (use na primeira vez)
.\start.ps1 -NoBrowser    # não abre o navegador
.\start.ps1 -BackendPort 9000   # Backend em outra porta (o Frontend recebe VITE_API_BASE_URL)
.\start.ps1 -DryRun       # só mostra o que faria
```

Se o PowerShell bloquear o script, rode `powershell -ExecutionPolicy Bypass -File .\start.ps1`. Para parar, feche as duas janelas ou use Ctrl+C em cada uma. O script confere o ambiente virtual, o `.env`, o Node, as portas 8000 e 5173 livres e instala as dependências do Frontend se faltarem.

Os passos manuais abaixo continuam valendo.

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

## Frontend

**Todos os comandos do Frontend rodam dentro de `frontend/`**, a partir da raiz do projeto: `cd frontend`.

### Instalação

```powershell
cd frontend
npm install
```

O `package.json` fixa versões exatas e o `package-lock.json` é versionado. Se aparecer o aviso `EBADENGINE`, a sua versão do Node é menor que a exigida (ver "Pré-requisitos").

### Execução

Com o Backend no ar (passos "Indexar a base" e "Subir a API"), em outro terminal:

```powershell
cd frontend
npm run dev
```

Abra `http://localhost:5173`. A porta **5173 é fixa**: o Backend só libera essa origem no CORS, então se ela estiver ocupada o Vite avisa e não sobe (libere a porta em vez de trocá-la).

Não é preciso login nem chave: o Frontend só conversa com a API local. Se o Backend usar outra porta, defina `VITE_API_BASE_URL` (por exemplo `http://localhost:8001`) em `frontend/.env.local`, que o Git ignora. Essa variável é pública no navegador, portanto nunca coloque credenciais nela.

### Como usar

- Digite a pergunta e pressione **Enter** (Shift+Enter quebra a linha). O limite é de 2000 caracteres.
- A resposta mostra, abaixo do texto, o **título do documento e o nome do arquivo** de onde veio. Sem fontes, a resposta vem de conhecimento geral e avisa isso no texto.
- A barra lateral guarda várias conversas no navegador: criar, alternar, renomear e excluir (com confirmação). Elas continuam ao recarregar a página.
- Se o Backend for reiniciado, a próxima pergunta mostra o aviso de que o contexto foi reiniciado; as mensagens antigas continuam na tela.
- Use **uma aba por vez**: as conversas ficam no `localStorage` e as abas não se sincronizam.

### Testes e verificação

```powershell
cd frontend
npm test                # testes de exemplo, de propriedades (fast-check) e de telas (Vitest + Testing Library)
npm run typecheck       # verificação de tipos (tsc --noEmit)
npm run build           # tipos + build de produção em frontend/dist/
```

Os testes não chamam o Backend nem a AWS (`fetch` sempre simulado). Para repetir uma falha de propriedade, use a seed e o caminho que o `fast-check` imprime: `fc.assert(propriedade, { seed, path })`.

## Verificação integrada (pendente)

Com Backend e Frontend no ar e a base indexada, confirmar no navegador:

| Teste | Esperado |
|---|---|
| Clicar na sugestão "Qual a garantia padrão dos tratores?" | Resposta com fonte `maquinas_agricolas_catalogo.md` e o título H1 do documento |
| Pergunta de acompanhamento na mesma conversa | Resposta pelo contexto, sem aviso de reinício |
| Pergunta fora da base | Texto avisa que não veio da base interna e nenhuma lista de fontes aparece |
| Reiniciar o Backend e perguntar na mesma conversa | Aviso de contexto reiniciado acima da resposta, mensagens antigas intactas |
| Recarregar a página | Conversas, fontes e títulos continuam |
| Parar o Backend e perguntar | Mensagem de erro com "Tentar novamente"; ao religar o Backend, a nova tentativa funciona |
| Console do navegador | Sem erros de CORS |

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
| `npm run dev` falha com "Port 5173 is already in use" | Outro processo usa a porta. Feche-o: o Backend só aceita a origem `http://localhost:5173` |
| Aviso `EBADENGINE` no `npm install` ou erro ao rodar `npm test` | Node abaixo do exigido. Instale o Node 22.22.2+, 24.15.0+ ou 26+ |
| O chat mostra "Não consegui falar com o assistente" | Backend fora do ar, porta diferente da configurada ou bloqueio de CORS. Confira `http://localhost:8000/health` |
| O chat mostra "A base de conhecimento ainda não foi indexada" | Falta rodar `ingest.py` |
| Aviso "Não foi possível salvar as conversas neste navegador" | `localStorage` cheio ou bloqueado (modo privado). As conversas valem só até recarregar a página |

## Estrutura do repositório

```
.env                         segredos (fora do Git; fornecido pelo facilitador)
start.ps1                    sobe Backend e Frontend ao mesmo tempo
anyone_kb/                   15 documentos da base de conhecimento
backend/                     API, ingestão, RAG, agente, sessões e testes
  scripts/ask.ps1            atalho para testar a API no PowerShell
  tests/                     testes de exemplo, de propriedades e de integração
  chroma_store/              índice local (gerado pela ingestão; fora do Git)
frontend/                    interface de chat (React + Vite + TypeScript)
  src/api/                   cliente de POST /v1/ask e textos de erro
  src/state/                 regras puras, reducer e contexto das conversas
  src/storage/               formato e gravação no localStorage
  src/hooks/                 fluxo de envio de perguntas (useChat)
  src/components/            chat, barra lateral, diálogo de confirmação
  src/test/                  geradores (fast-check), invariantes e utilitários de teste
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
   - Frontend: `aidlc-docs/construction/frontend/` (design funcional, NFR, resumo do código)
4. Abra a pasta no Kiro (em modo Vibe) e peça para continuar o AI-DLC. As regras em `.kiro/steering/aws-aidlc-rules/core-workflow.md` conduzem o fluxo.
5. **Próxima etapa:** Build and Test integrado (Backend com o Bedrock real e Frontend no navegador), conforme as tabelas de verificação acima. Depois: aprovação final do código das duas unidades.

Decisões já tomadas que valem para quem continuar: sem streaming, uma resposta JSON por pergunta; memória de conversa por `session_id` (20 mensagens, 50 sessões); se a base não responde, o agente responde com conhecimento geral e avisa; extensões Security e Resiliency desativadas, Property-Based Testing no modo Parcial.
