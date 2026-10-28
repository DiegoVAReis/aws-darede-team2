# Plano de NFR Requirements: Unidade 2 Frontend (profundidade mínima)

O stack já está definido em `tech-env.md` e `requirements.md` (React 18, Vite, TypeScript 5.x, `npm`, Vitest, React Testing Library). Esta etapa fecha as pendências do `requirements.md` §10 para o front (versões fixas e framework de PBT, regra PBT-09) e registra os requisitos não funcionais. Pelo combinado com o usuário ("o que já tiver respostas padrões definidas, pode seguir com o default; o que tiver dúvidas, questione no chat"), as decisões usam os padrões dos documentos de entrada e do Functional Design. Os pontos que dependem do ambiente do usuário estão nas premissas e foram levados ao chat.

## Checklist

- [x] Step 1: analisar o Functional Design do Frontend
- [x] Step 2: criar este plano
- [x] Step 3: avaliar as categorias de NFR (escalabilidade, desempenho, disponibilidade, segurança, stack, confiabilidade, manutenibilidade, usabilidade)
- [x] Step 4: salvar o plano
- [x] Step 5: respostas (padrões definidos nos documentos de entrada; sem ambiguidades; dúvidas de ambiente levadas ao chat)
- [x] Step 6a: gerar `aidlc-docs/construction/frontend/nfr-requirements/nfr-requirements.md`
- [x] Step 6b: gerar `aidlc-docs/construction/frontend/nfr-requirements/tech-stack-decisions.md`
- [x] Step 7: apresentar a mensagem de conclusão
- [ ] Step 8: aprovação do usuário
- [ ] Step 9: registrar a aprovação no `audit.md` e atualizar o `aidlc-state.md`

## Decisões tomadas pelos padrões

| Categoria | Decisão | Origem |
|---|---|---|
| Escalabilidade | Uso individual no navegador; sem limite de conversas; sem virtualização de lista | Q5 do Functional Design |
| Desempenho | Sem meta formal; tempo limite de 90 s por pergunta | Q9, NFR-05 |
| Disponibilidade | Sem retentativa automática; "Tentar novamente" manual | Q10, NFR-05 |
| Segurança | Checklist básico (NFR-03): sem segredos no front, Markdown seguro, links `noopener`; extensão Security desativada | requirements.md |
| Stack | Versões exatas no `package.json`, consultadas no registro npm e resolvidas em conjunto | requirements.md §10 |
| Confiabilidade | Dados do navegador ilegíveis não travam o app; falha de gravação mostra aviso | BR-PER-03, BR-PER-06 |
| Manutenibilidade | Vitest, React Testing Library e `fast-check`; verificação de tipos com `tsc` | NFR-06 |
| Usabilidade | Interface em português, acessibilidade básica, foco visível, navegação por teclado | Q17, FR-06.10 |
