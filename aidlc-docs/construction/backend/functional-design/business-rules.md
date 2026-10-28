# Regras de Negócio: Backend

Cada regra indica o requisito de origem e a decisão do plano de Functional Design (Q1 a Q14) quando houver.

## Ingestão (FR-01)

| ID | Regra | Origem |
|---|---|---|
| BR-ING-01 | Ler todos os `*.md` da pasta da base, em UTF-8, em ordem alfabética. Pasta inexistente ou sem documentos: erro claro e nenhuma alteração na coleção | FR-01.1 |
| BR-ING-02 | Dividir cada documento em janelas de 500 tokens (`cl100k_base`) com sobreposição de 50. Cada chunk tem no máximo 500 tokens. Documento com até 500 tokens vira um chunk só. O id do chunk é `{nome_sem_extensão}-{índice}` | FR-01.2, FR-01.4 |
| BR-ING-03 | O embedding de cada chunk é calculado sobre `"{título}\n\n{chunk}"`. O texto guardado e devolvido é só o chunk | Q3 |
| BR-ING-04 | O título é o primeiro H1 (`# ...`) do documento, ignorando blocos de código. Sem H1, usa o nome do arquivo sem extensão, com `_` trocado por espaço e a primeira letra maiúscula | FR-01.5, Q6 |
| BR-ING-05 | A gravação usa `upsert`. Rodar duas vezes não duplica chunks | FR-01.4, FR-01.6 |
| BR-ING-06 | Depois de gravar um documento, remover os chunks dele cujo id não foi regerado (documento que encolheu) | FR-01.6 |
| BR-ING-07 | Remover da coleção os chunks de arquivos que não existem mais na pasta | Q4 |
| BR-ING-08 | Falha ao gerar embedding em um documento: não alterar nem remover chunks dele, seguir para os demais, listar a falha no relatório e terminar com código de saída 1 | Q5 |
| BR-ING-09 | Ao final, imprimir documentos lidos, chunks gravados, removidos, total e falhas. Nunca imprimir segredos | FR-01.7 |

## Recuperação (FR-02)

| ID | Regra | Origem |
|---|---|---|
| BR-REC-01 | A coleção usa distância de cosseno | Q1 |
| BR-REC-02 | A busca devolve até `top_k` (padrão 3) trechos mais próximos | FR-02.1, Q2 |
| BR-REC-03 | Trechos com distância maior que o limite (padrão 0.6) são descartados. Distância igual ao limite é mantida | FR-02.3, Q1 |
| BR-REC-04 | As fontes são deduplicadas por arquivo, na ordem de relevância. Cada fonte leva o título do documento | FR-02.4 |
| BR-REC-05 | Sem trecho dentro do limite, o resultado informa `has_relevant = false` e a lista de fontes fica vazia | FR-02.3 |
| BR-REC-06 | Coleção inexistente ou vazia: `KB_NOT_INDEXED` | FR-05.4 |

## Agente (FR-03)

| ID | Regra | Origem |
|---|---|---|
| BR-AGE-01 | A tool `retrieve` registra no coletor as fontes devolvidas. Sem trecho relevante, devolve ao modelo um aviso explícito e não registra fontes | FR-03.4, FR-03.5 |
| BR-AGE-02 | A tool `not_in_knowledge_base` descarta as fontes do turno. O agente a chama quando os trechos não respondem à pergunta | FR-03.3, FR-03.4 |
| BR-AGE-03 | Sem informação na base, o agente responde com conhecimento geral e avisa explicitamente, no início da resposta e no idioma da pergunta, que a informação não veio da base interna. `sources` fica vazio | FR-03.3 |
| BR-AGE-04 | Perguntas de acompanhamento são reescritas como consultas completas antes de chamar `retrieve` | FR-03.2 |
| BR-AGE-05 | A resposta usa o idioma da pergunta | FR-03.2 |
| BR-AGE-06 | O texto da resposta não cita nomes de arquivo; as fontes viajam em `sources` | Q11 |
| BR-AGE-07 | Estilo: objetivo e direto, Markdown simples, sem inventar o que não está nos trechos. Se os trechos não trazem o detalhe, dizer isso | Q12 |
| BR-AGE-08 | As fontes de uma resposta vêm só das chamadas do turno atual, nunca do histórico | FR-03.5 |
| BR-AGE-09 | Falha dentro de uma tool é registrada no coletor e relançada pelo serviço depois da chamada do agente, porque o Strands entrega exceções de tools ao modelo em vez de propagá-las | services.md |

## Sessões (FR-04)

| ID | Regra | Origem |
|---|---|---|
| BR-SES-01 | Um agente por sessão, com janela deslizante de 20 mensagens | FR-04.1, FR-04.2 |
| BR-SES-02 | `session_id` desconhecido: criar a sessão com o mesmo id e responder `session_reset = true`. Sem `session_id`: criar uma sessão nova com UUID v4 e `session_reset = false` | FR-04.5, Q8 |
| BR-SES-03 | Máximo de 50 sessões ativas. Ao exceder, descartar a menos recentemente usada. A próxima pergunta dela volta com `session_reset = true` | FR-04.3, Q9 |
| BR-SES-04 | Chamadas simultâneas na mesma sessão são serializadas por uma trava por sessão. Sessões diferentes não se bloqueiam | FR-04.4 |
| BR-SES-05 | Usar uma sessão a marca como a mais recente | BR-SES-03 |
| BR-SES-06 | O processo roda com 1 worker | FR-04.6 |

## API (FR-05)

| ID | Regra | Origem |
|---|---|---|
| BR-API-01 | O texto da pergunta é aparado nas pontas antes de validar e de enviar ao agente. Vazio ou só espaços: `VALIDATION_ERROR`. Acima de 2000 caracteres (depois de aparar): `VALIDATION_ERROR`. Nenhuma chamada ao Bedrock acontece nesses casos | Q7 |
| BR-API-02 | `session_id` informado deve ter de 1 a 64 caracteres entre letras, números, `-` e `_`. Valor inválido: `VALIDATION_ERROR` | Q8 |
| BR-API-03 | Corpo ausente, campo `text` ausente ou tipo errado: `VALIDATION_ERROR` com mensagem genérica | FR-05.4 |
| BR-API-04 | A verificação de base indexada (`KB_NOT_INDEXED`) acontece no serviço, antes de chamar o agente | services.md |
| BR-API-05 | Falha ao chamar o Bedrock (rede, credencial, tempo limite de 60 s, limite de uso): `UPSTREAM_ERROR` | Q13 |
| BR-API-06 | Qualquer outra falha inesperada: `INTERNAL_ERROR` | Q10 |
| BR-API-07 | Mapa de status HTTP: `VALIDATION_ERROR` 422, `KB_NOT_INDEXED` 503, `UPSTREAM_ERROR` 502, `INTERNAL_ERROR` 500 | Q10 |
| BR-API-08 | Mensagens de erro não expõem segredos, caminhos, nomes de classes nem textos de exceções | NFR-03 |
| BR-API-09 | CORS só para as origens configuradas (padrão `http://localhost:5173`) | FR-05.5 |

## Logs (NFR-03, NFR-07)

| ID | Regra | Origem |
|---|---|---|
| BR-LOG-01 | Registrar apenas eventos: início, resultado da ingestão, 8 primeiros caracteres do id da sessão, duração do turno, quantidade de fontes e códigos de erro | Q14 |
| BR-LOG-02 | Nunca registrar o texto da pergunta, a resposta nem o token | Q14 |
