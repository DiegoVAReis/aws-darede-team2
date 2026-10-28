# Plano de Code Generation: Unidade 2 Frontend

Este plano é a fonte única de verdade da geração de código do Frontend. Aprovado por delegação do usuário ("As definições de front end já estão definidas, seguir com as definições padrão. Inicie o desenvolvimento.").

## Contexto da unidade

- **Histórias:** US-10 (aviso de contexto reiniciado), US-11, US-12, US-13, US-14, US-15, US-16 e US-17.
- **Dependências de outras unidades:** apenas o contrato HTTP v1 do Backend (`POST /v1/ask`). Nenhum código é compartilhado. Nos testes o `fetch` é simulado.
- **Código em:** `frontend/` na raiz do workspace e `README.md` na raiz. Documentação em `aidlc-docs/construction/frontend/code/`.
- **Entradas de design:** `functional-design/` (entidades, regras BR-*, fluxos, propriedades testáveis, componentes) e `nfr-requirements/` (valores fechados, versões exatas, `fast-check`).
- **Entidades de dados:** estado de conversas no `localStorage` (chave `anyone-assistant:conversations`). Não há banco de dados nem migração.
- **Interfaces consumidas:** `POST /v1/ask` do Backend (`http://localhost:8000`, ou `VITE_API_BASE_URL`).
- **Refinamentos em relação ao Functional Design:** `createInitialState` recebe também um gerador de id (`newId`), porque a bolha `NO_RESPONSE` precisa de um id e o reducer continua puro; `validateQuestion` devolve sempre `length`; o foco volta ao botão "Nova conversa" depois de excluir uma conversa; `ErrorBoundary` (NFR-F-27).
- **Elementos de interface automatizáveis:** todo controle interativo tem `data-testid` estável no padrão `{componente}-{papel}` (regra do AI-DLC para código de UI).

## Estrutura de arquivos

```
frontend/
  package.json  tsconfig.json  vite.config.ts  index.html
  src/
    main.tsx  App.tsx  App.module.css  constants.ts  types.ts  vite-env.d.ts
    styles/global.css
    api/            client.ts  errorMessages.ts
    storage/        persistence.ts  conversationStorage.ts
    state/          conversationRules.ts  questionValidation.ts  conversationsReducer.ts
                    ConversationsContext.tsx
    hooks/          useChat.ts
    components/
      Chat/         ChatWindow  MessageList  MessageBubble  SourceList  Notice
                    LoadingIndicator  ChatInput  SuggestedQuestions  MarkdownContent
      Sidebar/      Sidebar  ConversationItem  ConfirmDialog
      ErrorBoundary.tsx
    test/           setup.ts  arbitraries.ts  invariants.ts  helpers.tsx
```

Os testes ficam ao lado do código (`*.test.ts(x)` e `*.properties.test.ts`).

## Passos

- [x] **Step 1: Estrutura do projeto.** `frontend/package.json` (versões exatas, `engines`, scripts), `tsconfig.json`, `vite.config.ts` (porta 5173 com `strictPort`, Vitest/jsdom), `index.html`, `src/test/setup.ts`. Ajustar o `.gitignore` se faltar algo. Histórias: todas (base).
- [x] **Step 2: Tipos e constantes.** `src/types.ts`, `src/constants.ts`, `src/vite-env.d.ts`. Histórias: US-11 a US-15.
- [x] **Step 3: Regras puras de domínio.** `state/conversationRules.ts` (`codePointLength`, `deriveTitle`, `normalizeRename`, `dedupeSources`, `sortConversations`, `isEmptyConversation`) e `state/questionValidation.ts`. Testes de exemplo e de propriedades. Histórias: US-11, US-12, US-14.
- [x] **Step 4: Cliente da API e textos de erro.** `api/client.ts`, `api/errorMessages.ts`. Testes de exemplo (sucesso, cada `ErrorKind`, tempo esgotado, cancelamento). Histórias: US-11.
- [x] **Step 5: Persistência.** `storage/persistence.ts` (`serializeState`, `parseState`) e `storage/conversationStorage.ts`. Testes de exemplo e de propriedades (round-trip, entrada arbitrária). Histórias: US-15.
- [x] **Step 6: Reducer e estado inicial.** `state/conversationsReducer.ts` (ações, `createInitialState`, fábrica de conversa). Utilitários de teste (`test/arbitraries.ts`, `test/invariants.ts`, `test/helpers.tsx`). Testes de exemplo e de propriedades. Histórias: US-10, US-14, US-15.
- [x] **Step 7: Contexto e hook de envio.** `state/ConversationsContext.tsx`, `hooks/useChat.ts`. Testes de exemplo. Histórias: US-10, US-11, US-14, US-15.
- [x] **Step 8: Componentes de leitura.** `MarkdownContent`, `SourceList`, `Notice`, `LoadingIndicator`, `MessageBubble`, `MessageList`. Testes. Histórias: US-10, US-11, US-12.
- [x] **Step 9: Entrada e sugestões.** `ChatInput`, `SuggestedQuestions`. Testes. Histórias: US-11, US-13.
- [x] **Step 10: Barra lateral.** `ConfirmDialog`, `ConversationItem`, `Sidebar`. Testes. Histórias: US-14.
- [x] **Step 11: Composição e estilos.** `ChatWindow`, `ErrorBoundary`, `App`, `main.tsx`, `styles/global.css` e CSS Modules. Testes de integração do `App` (envio, Markdown e fontes, erros e nova tentativa, `session_reset`, recarga, renomear e excluir, resposta após trocar de conversa). Histórias: US-10 a US-15.
- [x] **Step 12: Instalação e verificação.** `npm install`, `npm run typecheck`, `npm test`, `npm run build`. Corrigir o que falhar.
- [x] **Step 13: Documentação.** `README.md` raiz (Frontend, Node, instalação, execução, testes, estrutura, estado do projeto; sem segredos) e `aidlc-docs/construction/frontend/code/code-summary.md`. Histórias: US-16, US-17.

## Rastreabilidade de histórias

| História | Passos |
|---|---|
| US-10 (aviso na interface) | 6, 7, 8, 11 |
| US-11 Interface estilo chat | 1, 4, 7, 8, 9, 11 |
| US-12 Título e arquivo das fontes | 8, 11 |
| US-13 Perguntas sugeridas | 9, 11 |
| US-14 Gerenciar conversas | 3, 6, 10, 11 |
| US-15 Recuperar conversas ao recarregar | 5, 6, 7, 11 |
| US-16 Subir o assistente localmente | 1, 12, 13 |
| US-17 Documentação sem segredos | 13 |

## Conformidade PBT (modo Parcial: PBT-02, 03, 07, 08, 09 bloqueantes)

| Regra | Como será atendida |
|---|---|
| PBT-01 | Propriedades de `business-logic-model.md` §7 usadas neste plano (Steps 3, 5 e 6) |
| PBT-02 | Round-trip de `serializeState` e `parseState` |
| PBT-03 | Invariantes do reducer (INV-01 a INV-09), `parseState` com entrada arbitrária, `deriveTitle`, `normalizeRename`, `validateQuestion`, `sortConversations`, `errorText` |
| PBT-04 | Idempotência de `dedupeSources` e de `sendStarted` repetido |
| PBT-07 | Geradores de domínio centralizados em `src/test/arbitraries.ts` |
| PBT-08 | `fast-check` imprime seed e caminho em falha; reprodução com `fc.assert(prop, { seed, path })` |
| PBT-09 | `fast-check` 4.10.2 no `package.json` e em `tech-stack-decisions.md` |
