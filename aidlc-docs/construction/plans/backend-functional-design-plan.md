# Plano de Functional Design: Unidade 1 Backend

Fontes: `unit-of-work.md`, `unit-of-work-story-map.md`, `component-methods.md`, `services.md`, `requirements.md` (FR-01 a FR-05, NFR-03, NFR-06) e as histórias US-01 a US-10.

Escopo: lógica de negócio, modelo de domínio, regras e fluxos do Backend, sem decisões de infraestrutura. Também identifica as propriedades testáveis exigidas pelo PBT-01.

## Como ler este arquivo

As respostas abaixo foram **sugeridas pelo assistente** (campo `[Answer]:`), a pedido do usuário. Elas ainda **não foram confirmadas**. Revise cada uma. Para aceitar, não precisa fazer nada além de avisar. Para alterar, troque a letra, ou escolha `X` e descreva depois da tag. A geração dos artefatos só começa depois da sua confirmação.

## Checklist de execução

- [x] Step 1: analisar o contexto da unidade
- [x] Step 2: criar este plano
- [x] Step 3: gerar as perguntas
- [x] Step 4: salvar o plano
- [x] Step 5: coletar e analisar as respostas (usuário autorizou seguir com as respostas padrão sugeridas; sem ambiguidades)
- [x] Step 6a: gerar `aidlc-docs/construction/backend/functional-design/domain-entities.md`
- [x] Step 6b: gerar `aidlc-docs/construction/backend/functional-design/business-rules.md`
- [x] Step 6c: gerar `aidlc-docs/construction/backend/functional-design/business-logic-model.md` (fluxos de ingestão, recuperação, turno de conversa e sessões, mais as propriedades testáveis do PBT-01)
- [x] Step 7: apresentar a mensagem de conclusão
- [x] Step 8: aprovação por delegação ("siga os próximos passos")
- [x] Step 9: registrar a aprovação no `audit.md` e atualizar o `aidlc-state.md`

---

## Parte 1: Recuperação (RAG)

## Question 1
Métrica de distância e limite de relevância padrão (FR-02.3). A coleção do ChromaDB usa L2 por padrão. Os embeddings do Titan v2 são normalizados, então a distância de cosseno é mais fácil de interpretar. O valor padrão é ajustável por variável de ambiente e deve ser calibrado com perguntas reais no Build and Test.

A) Coleção com distância de cosseno e limite padrão de 0.6 (descarta trechos com distância acima de 0.6)

B) Coleção com distância de cosseno e limite padrão de 0.45 (mais restritivo; mais respostas "fora da base")

C) Coleção com L2 (padrão do ChromaDB) e limite a calibrar depois

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O limite final deve ser ajustado depois de testar com as perguntas dos critérios de aceitação. Se a calibração mostrar outro valor, só muda a variável de ambiente.

[Answer]: A

## Question 2
Quantidade de trechos recuperados por pergunta (`top_k`, FR-02.1).

A) 3 (valor do `requirements.md` e do `tech-env.md`)

B) 5 (mais cobertura para perguntas que cruzam documentos, com mais tokens no prompt)

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A, para manter o que já está nos requisitos. A variável de ambiente permite subir para 5 sem mudar código.

[Answer]: A

## Question 3
Texto usado para gerar o embedding de cada chunk na ingestão.

A) Prefixar o título do documento (H1) ao chunk só no texto enviado ao Titan; o trecho guardado e devolvido continua sem o prefixo. Melhora a recuperação de chunks que não repetem o assunto do documento.

B) Embedding apenas do texto do chunk

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. É uma regra pequena, testável e de efeito direto na qualidade da busca.

[Answer]: A

---

## Parte 2: Ingestão

## Question 4
Documentos que saíram de `anyone_kb/` desde a última ingestão (arquivo apagado ou renomeado). O FR-01.6 cobre chunks obsoletos de um documento que ainda existe, mas não o caso de o documento inteiro sumir.

A) Remover da coleção os chunks de documentos que não existem mais na pasta (a coleção sempre reflete a pasta)

B) Manter os chunks antigos; só reportar a diferença no relatório

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Sem isso, o assistente continuaria citando documentos apagados.

[Answer]: A

## Question 5
Falha ao gerar embedding de um chunk durante a ingestão (erro do Bedrock).

A) Marcar o documento como falho, não alterar os chunks dele (nem remover os obsoletos), continuar com os demais, listar as falhas no relatório e terminar com código de saída 1

B) Abortar toda a ingestão no primeiro erro, com código de saída 1

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Como a ingestão é idempotente, basta rodar de novo para completar os documentos que falharam.

[Answer]: A

## Question 6
Título de um documento sem H1 (`extract_title`, fallback).

A) Nome do arquivo sem extensão, com `_` trocado por espaço e primeira letra maiúscula (ex.: `Politicas internas ti`)

B) Nome do arquivo sem extensão, sem alterações

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Os 15 documentos atuais têm H1, então o fallback é uma garantia e aparece raramente.

[Answer]: A

---

## Parte 3: Entrada da API, sessões e erros

## Question 7
Regras de validação do texto da pergunta (FR-05.4 e NFR-03).

A) Remover espaços das pontas antes de validar e de enviar ao agente; rejeitar texto vazio ou só espaços; tamanho máximo de 2000 caracteres (contado depois da remoção)

B) Mesmas regras, com tamanho máximo de 1000 caracteres

C) Mesmas regras, com tamanho máximo de 4000 caracteres

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. 2000 caracteres cobrem perguntas longas e limitam o custo por chamada. O front deve espelhar o limite.

[Answer]: A

## Question 8
Formato do `session_id` recebido do cliente. O Backend usa o valor como chave em memória, então ele deve ser validado.

A) Aceitar de 1 a 64 caracteres entre letras, números, `-` e `_`; valor inválido gera `VALIDATION_ERROR`; ids novos são gerados como UUID v4

B) Aceitar qualquer texto não vazio, sem validação de formato

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Impede valores gigantes ou estranhos como chave de sessão e é compatível com o UUID que o front vai gerar.

[Answer]: A

## Question 9
Limite de sessões ativas em memória (FR-04.3). Quando excedido, a sessão menos recentemente usada é descartada, e a próxima pergunta dela volta com `session_reset: true`.

A) 50 sessões

B) 20 sessões

C) 200 sessões

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. É folgado para uso individual e limita o uso de memória.

[Answer]: A

## Question 10
Mapeamento dos códigos de erro para HTTP. O contrato (`unit-of-work-dependency.md`) deixou esta decisão para o Functional Design. O front vai usar o `code` do corpo, mas o status deve ser coerente.

A) `VALIDATION_ERROR` 422, `KB_NOT_INDEXED` 503, `UPSTREAM_ERROR` 502, e um código extra `INTERNAL_ERROR` 500 para falhas inesperadas, sem detalhes internos

B) `VALIDATION_ERROR` 400, `KB_NOT_INDEXED` 503, `UPSTREAM_ERROR` 502, e `INTERNAL_ERROR` 500

C) Sem `INTERNAL_ERROR`; falhas inesperadas usam `UPSTREAM_ERROR` com 502

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O 422 é o padrão do FastAPI para falhas de validação, então erros do Pydantic e das regras próprias saem iguais. O `INTERNAL_ERROR` evita rotular como "Bedrock" um bug do próprio Backend.

[Answer]: A

---

## Parte 4: Agente e respostas

## Question 11
Citação de fontes dentro do texto da resposta. As fontes já viajam estruturadas em `sources` e o front as exibe abaixo da resposta.

A) O agente não cita nomes de arquivo no texto; as fontes aparecem só pela lista `sources`

B) O agente também menciona o documento no texto quando útil

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Evita duplicação e evita que o modelo cite um arquivo que não está em `sources`.

[Answer]: A

## Question 12
Estilo das respostas do agente (prompt de sistema).

A) Objetivo e direto, em Markdown simples (listas e negrito quando ajudam), sem inventar informação que não esteja nos trechos; quando faltar detalhe nos trechos, dizer isso

B) Detalhado, explicando o contexto de cada passo

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Combina com o objetivo de resolver a dúvida em minutos.

[Answer]: A

## Question 13
Tempo limite das chamadas ao Bedrock (embedding e modelo de texto).

A) 60 segundos de leitura por chamada, sem retentativa própria além do padrão do SDK; ao estourar, o erro vira `UPSTREAM_ERROR`

B) 120 segundos de leitura por chamada

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. O NFR-05 não exige política de retentativa, e 60 s é suficiente para uma resposta com uma chamada à tool.

[Answer]: A

---

## Parte 5: Logs

## Question 14
Conteúdo dos logs do Backend (NFR-03 e NFR-07).

A) Registrar apenas eventos: início, resultado da ingestão, id curto da sessão, tempo do turno, quantidade de fontes e códigos de erro. Nunca registrar o texto da pergunta, a resposta nem o token

B) Registrar também o texto da pergunta para depuração

X) Other (please describe after [Answer]: tag below)

Sugestão do assistente: A. Mantém o checklist de segurança básico sem perder informação para depurar problemas.

[Answer]: A
