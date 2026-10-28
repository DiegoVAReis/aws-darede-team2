# NFR Requirements: Backend

## Valores fechados (pendências do requirements.md §10)

| Item | Valor | Onde se configura |
|---|---|---|
| Limite de distância padrão | 0.6 (cosseno). Ponto de partida; deve ser calibrado no Build and Test com as perguntas dos critérios de aceitação | `RETRIEVAL_MAX_DISTANCE` |
| Limite de sessões ativas | 50 | `SESSION_MAX_COUNT` |
| Tamanho máximo do texto | 2000 caracteres, depois de aparar | `ASK_MAX_TEXT_CHARS` |
| Tempo limite de leitura do Bedrock | 60 s por chamada | `BEDROCK_READ_TIMEOUT` |
| Versões das dependências | Fixadas com `==` no `pyproject.toml` (ver `tech-stack-decisions.md`) | `backend/pyproject.toml` |
| Framework de testes de propriedades | Hypothesis no Backend | `tech-stack-decisions.md` |

## Requisitos não funcionais do Backend

### Desempenho e escala
- NFR-B-01: uso individual em uma máquina, 1 worker do Uvicorn. Sem meta de vazão.
- NFR-B-02: cada chamada ao Bedrock tem tempo limite de leitura de 60 s e de conexão de 10 s. Ao estourar, o erro vira `UPSTREAM_ERROR`.
- NFR-B-03: a memória das sessões é limitada pelo máximo de 50 sessões e pela janela de 20 mensagens.

### Disponibilidade e confiabilidade
- NFR-B-04: sem retentativa própria. Vale o comportamento padrão do SDK.
- NFR-B-05: a ingestão é idempotente e continua após falha em um documento (BR-ING-05 e BR-ING-08).
- NFR-B-06: a ausência de configuração obrigatória é registrada no log na inicialização, com os nomes das variáveis. A API sobe mesmo assim, para que `/health` responda e o front mostre o erro de upstream.

### Segurança (checklist básico, NFR-03)
- NFR-B-07: validação de toda entrada da API (BR-API-01 a BR-API-03).
- NFR-B-08: o token do Bedrock vem só do ambiente (`AWS_BEARER_TOKEN_BEDROCK`) e nunca é registrado em logs, respostas ou relatórios.
- NFR-B-09: mensagens de erro sem detalhes internos (BR-API-08).
- NFR-B-10: CORS restrito às origens configuradas.
- NFR-B-11: dependências com licença permissiva (MIT, Apache ou BSD).
- NFR-B-12: o texto das perguntas e das respostas não vai para os logs (BR-LOG-02).

### Manutenibilidade e testes
- NFR-B-13: `pytest` com cobertura mínima de 80% (`fail_under = 80` no `pyproject.toml`, aplicado quando o pytest roda com `--cov`).
- NFR-B-14: `ruff check` e `ruff format --check` sem erros.
- NFR-B-15: testes baseados em propriedades com Hypothesis, com shrinking ligado e a seed disponível na saída em caso de falha (PBT-08). Para reproduzir: `pytest --hypothesis-seed=<N>`.
- NFR-B-16: testes de exemplo e de propriedades ficam em arquivos separados (`test_*_properties.py` para PBT), conforme PBT-10.
- NFR-B-17: o Bedrock é sempre simulado nos testes; nenhum teste automático chama a AWS.

### Usabilidade
- NFR-B-18: mensagens de erro claras e em português; o front mapeia pelo `code`.

## Premissas e riscos do ambiente

| Item | Situação |
|---|---|
| Python | 3.13.5 confirmado pelo usuário no terminal dele (requisito: 3.11 ou superior) |
| `uv` | Não instalado. O `pyproject.toml` funciona com `pip` e `venv`; o `uv` é opcional |
| Acesso à internet na primeira execução | Necessário. O `tiktoken` baixa o vocabulário `cl100k_base` na primeira vez em que é usado (ingestão e testes de chunking) e o ChromaDB pode baixar componentes na criação do cliente |
| API Key do Bedrock | Válida, conforme o usuário (o comentário de validade no `.env` está desatualizado). Os testes automáticos não dependem dela |
| Execução dos comandos | O assistente não consegue executar Python no seu ambiente (isolamento do shell). Os comandos de teste e lint são executados por você; os resultados voltam para correção |
| Versões fixadas sem instalação prévia | As versões foram consultadas no PyPI, mas ainda não instaladas juntas. Pode haver conflito de resolução; se houver, ajustar a versão indicada no erro |
