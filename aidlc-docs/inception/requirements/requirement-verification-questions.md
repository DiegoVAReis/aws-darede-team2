# Perguntas de Verificacao de Requisitos

Os documentos `vision.md` e `tech-env.md` ja trazem bastante detalhe. As perguntas abaixo cobrem apenas pontos ambiguos ou omissos, mais os prompts de opt-in das extensoes do AI-DLC.

Responda preenchendo a letra apos a tag `[Answer]:`. Se nenhuma opcao servir, escolha a ultima (Other) e descreva.

---

## Question 1
No `tech-env.md`, o exemplo de `/v1/ask` apenas concatena os trechos recuperados, mas a visao pede que o agente Strands (com Amazon Nova Pro) gere a resposta final. Qual comportamento esperado no MVP?

A) O endpoint `/v1/ask` invoca o agente Strands, que usa `retrieve()` como tool e o Nova Pro gera a resposta final em linguagem natural, com fontes

B) Apenas retornar os trechos recuperados (sem LLM), como no exemplo de codigo

C) Ambos: o agente por padrao, e um modo de depuracao que retorna os trechos brutos

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
Como o agente deve se comportar quando a pergunta nao tem resposta na base de conhecimento (fora de escopo ou sem trechos relevantes)?

A) Responder explicitamente que nao encontrou a informacao na base interna, sem inventar, e retornar `sources` vazio

B) Responder com conhecimento geral do modelo, indicando que nao veio da base interna

C) Pedir ao usuario para reformular a pergunta

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
Qual o idioma das respostas do assistente?

A) Sempre portugues do Brasil

B) Mesmo idioma da pergunta do usuario

C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
Conversa multi-turno: o chat deve manter contexto entre perguntas (ex.: "e a garantia?" referindo-se a pergunta anterior)?

A) Nao, cada pergunta e independente (alinhado ao contrato `{ "text": "..." }` do `tech-env.md`)

B) Sim, o front envia o historico e o backend usa como contexto (exige estender o contrato da API)

C) Sim, manter a memoria de conversa dentro do agente Strands (sessao em memoria no backend)

D) Other (please describe after [Answer]: tag below)

[Answer]: C, porém avalie os impactos dessa escolha

## Question 5
Qual o escopo da interface React (Vite + TypeScript) no MVP?

A) Minimo: caixa de entrada, lista de mensagens, resposta com fontes exibidas, estados de carregando e erro

B) Minimo + historico da conversa persistido no navegador (localStorage) e botao "limpar conversa"

C) Minimo + exemplos de perguntas sugeridas na tela inicial

D) Other (please describe after [Answer]: tag below)

[Answer]: Interface estilo chat GPT, com os requisitos a A, B e C

## Question 6
Como o front-end deve exibir as fontes citadas?

A) Lista de nomes de arquivo (ex.: `maquinas_agricolas_catalogo.md`) abaixo da resposta

B) Lista de arquivos com trecho (passagem) usado, expansivel

C) Other (please describe after [Answer]: tag below)

[Answer]: Mostrar o cabeçalho do arquivo.

## Question 7
Streaming de resposta (token a token) e desejado?

A) Nao, resposta completa em uma unica chamada (mais simples, alinhado ao contrato do `tech-env.md`)

B) Sim, streaming via SSE ate o front

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
O `tech-env.md` descreve o chunking como "~500 tokens", mas o exemplo de codigo faz janelas de 500 palavras. Como tratar?

A) Manter o exemplo: janelas de ~500 palavras com overlap de 50 (aproximacao simples)

B) Usar contagem real de tokens (ex.: tokenizador) para ~500 tokens e overlap de 50

C) Chunking por secao Markdown (cabecalhos), respeitando limite maximo, com overlap

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 9
Os documentos em `anyone_kb/` tem cerca de 100 linhas cada. Com chunk de ~500, muitos documentos terao poucos chunks. A ingestao deve ser idempotente (rodar mais de uma vez sem duplicar)?

A) Sim, recriar a colecao a cada execucao da ingestao (limpa e reindexa tudo)

B) Sim, usar `upsert` com ids deterministicos (`{arquivo}-{indice}`)

C) Nao e necessario, a ingestao roda uma unica vez

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 10
Qual o gerenciador de pacotes/ambiente Python? O `.gitignore` menciona `uv`/`uv.lock`, e o `tech-env.md` cita `uv` fixando versoes.

A) `uv` com `pyproject.toml` (padrao do projeto)

B) `pip` + `venv` + `requirements.txt`

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 11
Qual o gerenciador de pacotes do front-end?

A) npm

B) pnpm

C) yarn

D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 12
CORS e portas locais: como o front React (Vite, porta 5173) deve falar com a API FastAPI?

A) FastAPI com CORS liberado apenas para `http://localhost:5173`, API em `localhost:8000`

B) Proxy do Vite para `/v1` e `/health` (sem CORS)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 13
Escopo de testes automatizados (o `tech-env.md` exige unitarios com 80% de cobertura no backend; integracao condicional; E2E opcional). O que gerar?

A) Backend: testes unitarios (pytest, meta de 80%) + teste de integracao do fluxo ingest, retrieve e `/v1/ask` com Bedrock mockado

B) Opcao A + testes de componentes do front (Vitest/React Testing Library)

C) Opcao A + teste de integracao real contra o Bedrock (requer `.env` valido, marcado como opcional)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 14
Lint/format e hooks de qualidade: o `tech-env.md` exige `ruff` no pre-commit. Deve ser configurado?

A) Sim: configurar `ruff` (lint e format) no `pyproject.toml` e um `.pre-commit-config.yaml`

B) Sim: configurar `ruff` apenas como comando manual (sem pre-commit)

C) Nao configurar neste momento

D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 15
Documentacao de entrega: o que deve acompanhar o codigo?

A) README com pre-requisitos, setup (`.env`, instalacao), como rodar ingestao, backend e front

B) README + exemplo `.env.example` (sem segredos) + script(s) de atalho para rodar tudo

C) Other (please describe after [Answer]: tag below)

[Answer]: A , porem a documentação sobre o env não pode export secrets.

---

# Opt-In das Extensoes do AI-DLC

## Question: Security Extensions
Devem as regras da extensao de seguranca (Security Baseline) ser aplicadas como restricoes bloqueantes neste projeto?

A) Sim: aplicar todas as regras SECURITY como restricoes bloqueantes (recomendado para aplicacoes de nivel producao)

B) Nao: ignorar todas as regras SECURITY (adequado para PoCs, prototipos e projetos experimentais)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Resiliency Extensions
Deve o baseline de resiliencia ser aplicado a este projeto?

Esta extensao aplica praticas diretivas de design, derivadas do pilar de Confiabilidade do AWS Well-Architected Framework (tolerancia a falhas, alta disponibilidade, observabilidade e recuperabilidade). Ela nao torna a carga de trabalho pronta para producao nem certifica metas de disponibilidade, RTO ou RPO. E um ponto de partida e nao substitui uma Well-Architected Review formal.

A) Sim: aplicar o baseline de resiliencia como orientacao de design (recomendado para cargas criticas)

B) Nao: ignorar o baseline de resiliencia (adequado para PoCs, prototipos e projetos experimentais, onde iteracao rapida pesa mais que confiabilidade)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
Devem as regras de testes baseados em propriedades (PBT) ser aplicadas neste projeto?

A) Sim: aplicar todas as regras PBT como restricoes bloqueantes (recomendado para projetos com logica de negocio, transformacoes de dados, serializacao ou componentes com estado)

B) Parcial: aplicar PBT apenas para funcoes puras e round-trips de serializacao (adequado para projetos com pouca complexidade algoritmica)

C) Nao: ignorar todas as regras PBT (adequado para CRUDs simples, projetos so de UI ou camadas finas de integracao)

X) Other (please describe after [Answer]: tag below)

[Answer]: B
