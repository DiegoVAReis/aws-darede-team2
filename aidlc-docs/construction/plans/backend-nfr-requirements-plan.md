# Plano de NFR Requirements: Unidade 1 Backend (profundidade mínima)

O stack já está definido em `tech-env.md` e `requirements.md`. Esta etapa fecha as pendências do `requirements.md` §10 e registra o framework de PBT (PBT-09). Pelo combinado com o usuário, as decisões usam os valores padrão e as dúvidas vão ao chat. Nenhuma ficou em aberto, exceto a validação do ambiente, que está listada nas premissas.

## Checklist

- [x] Step 1: analisar o Functional Design do Backend
- [x] Step 2: criar este plano
- [x] Step 3: avaliar as categorias de NFR (escalabilidade, desempenho, disponibilidade, segurança, stack, confiabilidade, manutenibilidade, usabilidade)
- [x] Step 4: salvar o plano
- [x] Step 5: respostas (padrões definidos nos documentos de entrada; nenhuma ambiguidade)
- [x] Step 6a: gerar `aidlc-docs/construction/backend/nfr-requirements/nfr-requirements.md`
- [x] Step 6b: gerar `aidlc-docs/construction/backend/nfr-requirements/tech-stack-decisions.md`
- [x] Step 7: apresentar a mensagem de conclusão
- [x] Step 8: aprovação por delegação ("siga os próximos passos")
- [x] Step 9: registrar no `audit.md` e atualizar o `aidlc-state.md`

## Decisões tomadas pelos padrões

| Categoria | Decisão | Origem |
|---|---|---|
| Escalabilidade | Uso individual, 1 worker, 50 sessões em memória | Q9 do Functional Design, FR-04.6 |
| Desempenho | Sem meta formal; tempo limite de 60 s por chamada ao Bedrock | Q13, NFR-05 |
| Disponibilidade | Sem política de retentativa própria; erros viram `UPSTREAM_ERROR` | NFR-05 |
| Segurança | Checklist básico (NFR-03); extensão Security desativada | requirements.md |
| Stack | Versões exatas no `pyproject.toml` | requirements.md §10 |
| Confiabilidade | Ingestão idempotente e tolerante a falhas por documento | BR-ING-05, BR-ING-08 |
| Manutenibilidade | `ruff`, `pytest`, cobertura mínima de 80% | NFR-06 |
| Usabilidade | Mensagens de erro em português, sem detalhes internos | BR-API-08 |
