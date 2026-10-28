# Technical Environment: Assistente de Conhecimento Interno da Anyone Agro Business

> Formato Comprehensive. Projeto didático/fictício, greenfield, execução
> estritamente local. Este documento foi detalhado ao máximo para resumir a
> fase de Inception e as sub-fases de design da Construction do AI-DLC —
> decisões de arquitetura, API, dados, segurança e testes já estão fixadas.

## Project Technical Summary

- **Project Name:** Assistente de Conhecimento Interno da Anyone Agro Business
- **Project Type:** Greenfield
- **Primary Runtime Environment:** Local (máquina de cada participante)
- **Cloud Provider:** AWS (apenas Bedrock, acessado via API Key compartilhada fornecida pelo facilitador)
- **Target Deployment Model:** Execução local — sem deploy remoto (descartado neste cenário)
- **Team Size:** Participantes do workshop (facilitação: Matheus Requino)
- **Team Experience:** Variada — documento assume familiaridade básica com Python e JavaScript

## Programming Languages

### Required Languages

| Language | Version | Purpose | Rationale |
| --- | --- | --- | --- |
| Python | 3.11+ | Agente (Strands), RAG, ingestão, camada HTTP (FastAPI) | Ecossistema maduro para IA/RAG e SDK Bedrock (boto3) |
| TypeScript | 5.x | Front-end React | Tipagem no front; padrão do time |

### Permitted Languages

| Language | Conditions for Use |
| --- | --- |
| JavaScript | Permitido no front se TypeScript for inviável para algum participante |

### Prohibited Languages

| Language | Reason |
| --- | --- |
| Outras linguagens de backend (Go, Java, etc.) | Manter o escopo do workshop coeso em Python |

## Frameworks and Libraries

### Required Frameworks

| Framework/Library | Version | Domain | Rationale |
| --- | --- | --- | --- |
| Strands Agents | latest | Orquestração do agente | Framework alvo do workshop; expõe o RAG como tool |
| FastAPI | latest | Camada HTTP local | Simples, assíncrono, similar ao Express.js; integra com Pydantic |
| Pydantic | 2.x | Validação request/response | Contratos de API tipados |
| ChromaDB | latest | Vector store local | Persistência local, metadados nativos (citação de fonte) |
| boto3 | >=1.39 | Cliente AWS Bedrock | Invocação de Nova Pro e Titan Embeddings; versão >=1.39 reconhece `AWS_BEARER_TOKEN_BEDROCK` (API Key) |
| ReactJS (Vite) | 18.x | Front-end | Interface do chat; padrão do time |

### Preferred Libraries

| Library | Purpose | Use When |
| --- | --- | --- |
| httpx | Cliente HTTP no React → testes/integração | Chamadas à API local |
| uvicorn | ASGI server | Rodar o FastAPI localmente |
| python-dotenv | Carregar o `.env` (API Key do Bedrock + configs) no startup | Sempre — o `.env` é fornecido pelo facilitador |

### Prohibited Libraries

| Library | Reason | Alternative |
| --- | --- | --- |
| sentence-transformers | Instalação lenta, exige hardware considerável | Amazon Titan Embeddings (Bedrock) |
| FAISS | Sem armazenamento nativo de texto/metadados; gestão manual de citação | ChromaDB |
| Pinecone / OpenSearch / vector store gerenciado | Gera custo; objetivo é execução local | ChromaDB local |
| LLMs premium/caros | RAG não exige; aumenta custo | Amazon Nova Pro |

## Cloud Environment

### Service Allow List

| Service | Approved Use Cases | Constraints |
| --- | --- | --- |
| Amazon Bedrock — Amazon Nova Pro | Geração da resposta final do RAG | `amazon.nova-pro-v1:0`; acessado via **API Key compartilhada** fornecida pelo facilitador (conta AWS do facilitador, não do participante) |
| Amazon Bedrock — Titan Embeddings | Geração de embeddings na ingestão e na query | `amazon.titan-embed-text-v2:0`; mesmo modelo de acesso via API Key |

### Service Disallow List

| Service | Reason | Alternative |
| --- | --- | --- |
| Qualquer serviço de hospedagem/compute remoto (EC2, ECS, Lambda, API Gateway, S3) | Deploy remoto descartado; tudo roda local | Execução local |
| Vector DB gerenciado (OpenSearch Serverless, Kendra) | Custo; fora do escopo | ChromaDB local |

## Preferred Technologies and Patterns

### Architecture Pattern

Monólito modular local, em processo único Python, com fronteiras claras entre módulos:

```
rag-agent-chatbot-v2/
├── backend/
│   ├── main.py          # FastAPI — endpoints /health e /v1/ask
│   ├── agent.py         # Strands Agent, usa retrieve() como tool + Amazon Nova Pro
│   ├── rag.py           # recuperação (query ao ChromaDB) + citação de fonte
│   ├── ingest.py        # pipeline de ingestão (chunking + Titan + Chroma)
│   └── chroma_store/    # persistência local do ChromaDB (gerada pela ingestão)
├── anyone_kb/           # ~15 documentos .md (conhecimento interno, descompactados do zip)
└── frontend/            # React (Vite) — UI do chat
```

- O front React consome a API FastAPI local.
- O agente (Strands + Nova) usa `retrieve()` como tool.
- A ingestão é um passo offline executado uma vez antes do uso.

### API Design Standards

- **Style:** REST, JSON
- **Versioning:** prefixo de caminho `/v1`
- **Naming Convention:** caminhos em kebab/lowercase; campos JSON em `snake_case`
- **Endpoints:**
  - `GET /health` — healthcheck, retorna `{ "status": "ok" }`
  - `POST /v1/ask` — recebe `{ "text": "..." }`, retorna `{ "answer": "...", "sources": [...] }`
- **Error Format:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'text' must not be empty."
  }
}
```

### Data Patterns

- **Primary Data Store:** ChromaDB local (`PersistentClient` em `backend/chroma_store/`), coleção `anyone`
- **Chunking:** split por ~500 tokens com overlap de 50 tokens; cada chunk guarda `metadata.source` com o nome do arquivo de origem (habilita citação de fonte)
- **Caching Strategy:** nenhuma — base pequena, recuperação instantânea

## Security Requirements

### Authentication and Authorization

- **Auth Method:** nenhuma — aplicação local de uso individual
- **Authorization Model:** N/A (sem multiusuário)

### Data Protection

- **Encryption at Rest:** N/A — dados públicos/didáticos, execução local
- **Encryption in Transit:** TLS nas chamadas ao Bedrock (padrão do SDK); API local em `localhost`
- **PII Handling:** a base não contém PII; documentos internos fictícios da Anyone Agro Business (empresa simulada), sem dados pessoais reais

### Secrets Management

- **Modelo de autenticação (workshop):** o acesso ao Bedrock é feito por uma **Amazon Bedrock API Key** (long-term, compartilhada) fornecida pelo **facilitador**. O facilitador entrega um arquivo `.env` pronto a cada participante; **nenhum participante provisiona recursos AWS nem cria credenciais durante o evento**.
- **Como o código autentica:** a API Key é lida da variável de ambiente `AWS_BEARER_TOKEN_BEDROCK`. O SDK `boto3` (>= 1.39) reconhece essa variável automaticamente — o `boto3.client("bedrock-runtime")` passa a usar o Bearer token sem necessidade de `aws_access_key_id`/`aws_secret_access_key`. **Não** usar access key/secret tradicionais.
- **Distribuição:** o `.env` é enviado pelo facilitador (por e-mail) antes do evento e deve ser colocado na raiz do projeto. O agente deve carregar o `.env` no startup (ex.: `python-dotenv`).
- **Variáveis esperadas no `.env`:**
  - `AWS_BEARER_TOKEN_BEDROCK` — a API Key do Bedrock (segredo)
  - `AWS_REGION=us-east-1`
  - `BEDROCK_MODEL_ID=amazon.nova-pro-v1:0`
  - `BEDROCK_EMBED_MODEL_ID=amazon.titan-embed-text-v2:0`
- **Prohibited Practices:** nunca commitar o `.env` nem a API Key (já coberto pelo `.gitignore`); sem secrets no front-end; não expor o Bearer token em logs.

### Compliance

- **Standards:** nenhuma específica (projeto didático)
- **Security Framework:** checklist interno básico (validação de input, sem secrets no repo)

### Dependency Security

- **Scanning:** opcional no workshop; `uv` fixa versões via `uv.lock`
- **License Policy:** apenas dependências open-source de licença permissiva (MIT/Apache/BSD)

## Testing Requirements

| Test Type | Required | Coverage Target | Tooling |
| --- | --- | --- | --- |
| Unit | Sim | 80% (backend Python) | pytest |
| Integration | Condicional | Fluxo ingest → retrieve → /v1/ask | pytest |
| End-to-End | Opcional | UI React → API | — |
| Contract | Não | — | — |
| Performance | Não | — | — |
| Security | Não | — | — |

### CI/CD Testing Gates

| Pipeline Stage | Required Tests | Failure Action |
| --- | --- | --- |
| Pre-commit | ruff (lint/format) | Bloqueia commit |
| Pull Request | pytest (unit) | Bloqueia merge |
| Pre-deploy | N/A — sem deploy remoto | — |
| Post-deploy | N/A | — |

## Example Code Patterns

Código funcional (não pseudocódigo). O RAG retorna resposta **com citação de
fonte**, atendendo ao critério de sucesso definido no `vision.md`.

### Ingestão da knowledge base (chunking + Titan + ChromaDB)

```python
# backend/ingest.py — indexa os ~15 documentos da pasta local no ChromaDB
import json
import os
from pathlib import Path

import boto3
import chromadb
from dotenv import load_dotenv

load_dotenv()  # carrega .env (AWS_BEARER_TOKEN_BEDROCK, AWS_REGION, model ids)

KB_DIR = Path("anyone_kb")               # pasta descompactada do zip (conhecimento interno)
CHROMA_DIR = "backend/chroma_store"      # persistência local
EMBED_MODEL_ID = os.environ.get("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")
CHUNK_SIZE = 500                          # tokens (aprox. por palavras)
CHUNK_OVERLAP = 50

# Autenticação via Amazon Bedrock API Key: boto3 (>=1.39) lê automaticamente a
# variável de ambiente AWS_BEARER_TOKEN_BEDROCK fornecida pelo facilitador no .env.
# Nenhuma access key/secret é necessária.
bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))


def embed(text: str) -> list[float]:
    """Generate an embedding for a text chunk using Amazon Titan."""
    response = bedrock.invoke_model(
        modelId=EMBED_MODEL_ID,
        body=json.dumps({"inputText": text}),
    )
    return json.loads(response["body"].read())["embedding"]


def chunk(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping word windows (~size words each)."""
    words = text.split()
    step = size - overlap
    return [" ".join(words[i : i + size]) for i in range(0, len(words), step)] or [text]


def ingest() -> None:
    """Index every markdown document in KB_DIR into a local ChromaDB collection."""
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_or_create_collection("anyone")

    for doc in sorted(KB_DIR.glob("*.md")):
        content = doc.read_text(encoding="utf-8")
        for idx, piece in enumerate(chunk(content)):
            collection.add(
                ids=[f"{doc.stem}-{idx}"],
                embeddings=[embed(piece)],
                documents=[piece],
                metadatas=[{"source": doc.name}],  # enables source citation
            )
    print(f"Indexed {collection.count()} chunks into '{CHROMA_DIR}'.")


if __name__ == "__main__":
    ingest()
```

### Domain function (recuperação RAG com citação de fonte)

```python
# backend/rag.py — recupera os chunks mais relevantes e devolve texto + fontes
import chromadb

from ingest import CHROMA_DIR, embed


def retrieve(question: str, top_k: int = 3) -> dict:
    """Retrieve the most relevant passages for a question.

    Returns the matched passages and their deduplicated source filenames so
    the agent can cite where each answer came from.
    """
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    collection = client.get_collection("anyone")

    result = collection.query(
        query_embeddings=[embed(question)],
        n_results=top_k,
    )
    passages = result["documents"][0]
    sources = list(dict.fromkeys(meta["source"] for meta in result["metadatas"][0]))
    return {"passages": passages, "sources": sources}
```

### Endpoint (FastAPI)

```python
# backend/main.py — expõe o agente ao front React
from fastapi import FastAPI
from pydantic import BaseModel, Field

from rag import retrieve

app = FastAPI(title="Anyone Agro Business - Assistente de Conhecimento Interno")


class Question(BaseModel):
    text: str = Field(min_length=1)


class Answer(BaseModel):
    answer: str
    sources: list[str]


@app.get("/health")
def health() -> dict:
    """Liveness probe for the local server."""
    return {"status": "ok"}


@app.post("/v1/ask", response_model=Answer)
def ask(question: Question) -> Answer:
    """Answer an internal-knowledge question grounded in the local knowledge base.

    The Strands Agent uses `retrieve` as a tool and Amazon Nova generates the
    final answer. This handler shows the contract the React front-end consumes.
    """
    context = retrieve(question.text)
    answer = "\n\n".join(context["passages"])  # agent/Nova produces the final text
    return Answer(answer=answer, sources=context["sources"])
```

### Test (pytest)

```python
# backend/test_rag.py
from unittest.mock import patch

import rag


@patch("rag.chromadb")
@patch("rag.embed", return_value=[0.1, 0.2, 0.3])
def test_retrieve_returns_passages_and_deduped_sources(mock_embed, mock_chromadb):
    """retrieve() returns matched passages with deduplicated source files."""
    collection = mock_chromadb.PersistentClient.return_value.get_collection.return_value
    collection.query.return_value = {
        "documents": [["Garantia padrão de fábrica: 12 meses ou 1.200 horas..."]],
        "metadatas": [[
            {"source": "maquinas_agricolas_catalogo.md"},
            {"source": "maquinas_agricolas_catalogo.md"},
        ]],
    }

    result = rag.retrieve("Qual a garantia padrão dos tratores?")

    assert result["passages"] == ["Garantia padrão de fábrica: 12 meses ou 1.200 horas..."]
    assert result["sources"] == ["maquinas_agricolas_catalogo.md"]  # deduplicated
    mock_embed.assert_called_once()
```

## Knowledge Base — Documentos propostos (~15)

Gerados com o Kiro, em Markdown, dentro de `anyone_kb/`. Cada documento tem
título, seções curtas e linguagem de documentação interna, sem emojis.

| # | Arquivo | Tópico |
| --- | --- | --- |
| 1 | `institucional_anyone_agro.md` | Quem é a empresa, unidades de negócio, governança |
| 2 | `maquinas_agricolas_catalogo.md` | Catálogo técnico de tratores, colheitadeiras, pulverizadores e implementos |
| 3 | `maquinas_manutencao_procedimentos.md` | Manutenção preventiva/preditiva, abertura de chamado, peças |
| 4 | `carne_bovina_processamento.md` | Fluxo de abate, desossa, cortes e cadeia do frio |
| 5 | `carne_rastreabilidade_exportacao.md` | Rastreabilidade do lote, requisitos de exportação, halal, recall |
| 6 | `normas_sanitarias.md` | Inspeção, BPF, APPCC, higiene e controle de temperatura |
| 7 | `cooperativa_atendimento_cooperado.md` | Adesão, serviços ao cooperado, canais e sobras |
| 8 | `insumos_catalogo_tecnico.md` | Defensivos, fertilizantes, sementes e receituário agronômico |
| 9 | `insumos_uso_seguro_defensivos.md` | EPI, aplicação segura, tríplice lavagem, carência e reentrada |
| 10 | `credito_rural_cooperado.md` | Custeio, investimento, comercialização, garantias, CPR/FIAGRO/CRA |
| 11 | `seguros_agricolas.md` | Modalidades, coberturas, subvenção e processo de sinistro |
| 12 | `logistica_armazenagem.md` | Recebimento de grãos, secagem, silos, escoamento e agendamento |
| 13 | `compliance_ambiental.md` | CAR, reserva legal, APP, licenciamento, logística reversa |
| 14 | `politicas_internas_ti.md` | Acesso, senhas, classificação da informação, segurança e suporte |
| 15 | `faq_colaborador_onboarding.md` | Dúvidas frequentes dos primeiros dias do colaborador |

## Resolved Decisions (sem TBDs)

- **Deploy remoto:** descartado — execução estritamente local
- **Chunking:** ~500 tokens com overlap de 50
- **LLM:** Amazon Nova Pro (`amazon.nova-pro-v1:0`, Bedrock)
- **Embeddings:** Amazon Titan Embeddings (`amazon.titan-embed-text-v2:0`)
- **Vector store:** ChromaDB local
- **Autenticação Bedrock:** API Key compartilhada (long-term) fornecida pelo facilitador via `.env` (`AWS_BEARER_TOKEN_BEDROCK`); `boto3` >=1.39 lê a variável automaticamente. Participantes não provisionam AWS nem criam credenciais durante o evento.
- **Região:** `us-east-1`
- **Lista dos 15 documentos:** definida acima e já gerada em `anyone_kb/`
