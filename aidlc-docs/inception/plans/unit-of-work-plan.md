# Plano de Units of Work

Escopo: decompor o sistema em unidades de trabalho para as etapas de design e geração de código da Construction.

Fontes: `requirements.md`, `stories.md`, `application-design.md` e `execution-plan.md`.

**Definição usada:** o sistema é uma aplicação local única (monolito modular). Cada unidade é um conjunto lógico de histórias e componentes, construído e testado em sequência. Não há serviços implantáveis de forma independente.

## Parte A. Proposta de decomposição

| Unidade | Pasta | Componentes | Histórias propostas |
|---|---|---|---|
| Unidade 1: Backend | `backend/` | BC-01 a BC-13 | US-01 a US-10 |
| Unidade 2: Frontend | `frontend/` | FC-01 a FC-10 | US-11 a US-15 |
| Transversal | raiz do projeto | README, `.gitignore`, `.env` | US-16, US-17 (atribuição na Question 1) |

**Motivos da divisão:**
- Linguagens e ferramentas diferentes (Python com `uv`, TypeScript com `npm`).
- O Frontend depende só do contrato HTTP do Backend.
- Backend primeiro permite testar o contrato antes de construir a interface.

## Parte B. Categorias avaliadas

| Categoria | Avaliação |
|---|---|
| Story Grouping | Coberta pelas Questions 1 e 2 |
| Dependencies | Coberta pela Question 3 |
| Team Alignment | Equipe única (participantes do workshop); a ordem de construção é coberta pela Question 2 |
| Technical Considerations | Sem diferenças de escala ou implantação entre as unidades, pois tudo roda local. Sem pergunta |
| Business Domain | Um único contexto de negócio (conhecimento interno da Anyone Agro). Sem pergunta |
| Code Organization (greenfield multi-unit) | Coberta pelas Questions 4 e 5 |

## Parte C. Perguntas

> Respostas preenchidas com a opcao A (recomendada) em todas, a pedido do usuario ("usa as recomendadas").

Responda preenchendo a letra após a tag `[Answer]:`. As opções marcadas com "(recomendada)" são as mais alinhadas ao `tech-env.md` e aos requisitos. Se nenhuma servir, escolha a última (Other) e descreva.

### Question 1 (histórias transversais)
As histórias US-16 (subir o assistente localmente) e US-17 (documentação sem segredos) dependem das duas unidades. Em qual unidade serão construídas?

A) No Frontend, última unidade a ser construída, quando os dois lados existem e o README raiz pode ser escrito completo; o Backend deixa os comandos e variáveis anotados no resumo de código (recomendada)

B) No Backend, com o README raiz criado cedo e a seção do Frontend acrescentada depois

C) Em uma terceira unidade pequena "Entrega" no final

D) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2 (ordem de construção)
Como sequenciar as unidades?

A) Sequencial: Backend completo (design, código e testes), depois Frontend (recomendada)

B) Em paralelo, com o contrato HTTP fixado desde o início

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 3 (contrato entre as unidades)
Como tratar o contrato HTTP entre Backend e Frontend?

A) O contrato fica descrito em `unit-of-work-dependency.md`; o Frontend é construído contra ele com `fetch` simulado nos testes, e a integração real é verificada no Build and Test (recomendada)

B) Além disso, exportar o esquema OpenAPI do FastAPI para um arquivo versionado e usá-lo como referência dos tipos do Frontend

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 4 (estrutura de diretórios)
As regras do AI-DLC sugerem `{unidade}/src/` e `{unidade}/tests/`. O `tech-env.md` e o Application Design usam módulos planos em `backend/` e `frontend/src/`. Qual estrutura adotar?

A) Manter o Application Design: `backend/*.py` (módulos planos), `backend/tests/`, `frontend/src/` com testes ao lado dos arquivos (`*.test.tsx`), `anyone_kb/` na raiz (recomendada)

B) Seguir o padrão do AI-DLC: `backend/src/`, `backend/tests/`, `frontend/src/`, `frontend/tests/`

C) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 5 (projeto Python e configuração)
Onde fica o projeto Python gerenciado pelo `uv`?

A) `pyproject.toml` em `backend/`, comandos executados a partir de `backend/` (`uv run uvicorn main:app`, `uv run python ingest.py`, `uv run pytest`); o `.env` continua na raiz do projeto e o `config.py` o localiza a partir do próprio caminho (recomendada)

B) `pyproject.toml` na raiz do projeto, comandos executados a partir da raiz

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Parte D. Checklist de execução (após as respostas e a aprovação deste plano)

### Fase 1. Preparação
- [x] Analisar as respostas e resolver ambiguidades
- [x] Obter aprovação explícita do plano

### Fase 2. Artefatos obrigatórios
- [x] Gerar `aidlc-docs/inception/application-design/unit-of-work.md` com definição e responsabilidades das unidades e a estratégia de organização de código (greenfield)
- [x] Gerar `aidlc-docs/inception/application-design/unit-of-work-dependency.md` com a matriz de dependências e o contrato HTTP
- [x] Gerar `aidlc-docs/inception/application-design/unit-of-work-story-map.md` mapeando as histórias US-01 a US-17 às unidades

### Fase 3. Validação
- [x] Validar limites e dependências das unidades
- [x] Garantir que todas as histórias estão atribuídas a uma unidade
- [x] Atualizar `aidlc-state.md` e registrar no `audit.md`

## Parte E. Decisões consolidadas (respostas validadas, sem ambiguidades pendentes)

| Tema | Decisão | Origem |
|---|---|---|
| Unidades | Unidade 1 Backend (`backend/`) e Unidade 2 Frontend (`frontend/`) | Parte A |
| US-16 e US-17 | Construídas na Unidade 2 (Frontend), a última; o Backend deixa comandos e variáveis anotados no resumo de código para o README raiz | Question 1 = A |
| Ordem | Sequencial: Backend completo (design, código e testes), depois Frontend | Question 2 = A |
| Contrato HTTP | Descrito em `unit-of-work-dependency.md`; o Frontend usa `fetch` simulado nos testes; a integração real é verificada no Build and Test | Question 3 = A |
| Estrutura | `backend/*.py` (módulos planos), `backend/tests/`, `frontend/src/` com testes ao lado dos arquivos, `anyone_kb/` na raiz | Question 4 = A |
| Projeto Python | `pyproject.toml` em `backend/`; comandos a partir de `backend/` (`uv run uvicorn main:app`, `uv run python ingest.py`, `uv run pytest`); `.env` na raiz, localizado pelo `config.py` a partir do próprio caminho | Question 5 = A |

Observações:
- A estrutura difere do padrão genérico `{unidade}/src/` das regras do AI-DLC, por escolha explícita (Question 4 = A), para manter o alinhamento com o `tech-env.md` e o Application Design.
- O `.gitignore` já cobre `backend/chroma_store/`, `.env`, `.env.*`, `node_modules/` e artefatos de teste.
