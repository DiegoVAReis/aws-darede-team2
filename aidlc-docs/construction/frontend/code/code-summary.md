# Resumo do Código: Frontend

Código em `frontend/` (React 18.3.1 + Vite 8.3.5 + TypeScript 5.9.3). Plano: `aidlc-docs/construction/plans/frontend-code-generation-plan.md`. Documentação de uso: `README.md` na raiz.

## Resultado da verificação (executada no ambiente do assistente, Node 24.15.0 e npm 11.12.1)

| Verificação | Resultado |
|---|---|
| `npm install` | 207 pacotes, sem conflitos de dependências de pares |
| `npm run typecheck` (`tsc --noEmit`, `strict`) | Sem erros |
| `npm test` (`vitest run`) | 19 arquivos, 187 testes, todos passaram |
| `npm run build` | Build de produção gerado (JS 326,8 kB, 102,6 kB comprimido) |
| `npm run dev` | Servidor sobe em `http://localhost:5173` (porta fixa) e serve `index.html` e `src/main.tsx` |

**Não verificado:** uso real no navegador contra o Backend e o Bedrock (o ambiente do assistente não tem navegador nem executa o Python do Backend). Esses itens estão na tabela "Verificação integrada" do README e seguem para o Build and Test.

## Arquivos de aplicação

| Caminho | Conteúdo | Histórias |
|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Versões exatas, `engines`, scripts, porta 5173 com `strictPort`, Vitest com jsdom | US-16 |
| `src/types.ts`, `src/constants.ts`, `src/vite-env.d.ts` | Tipos do domínio, constantes (2000 caracteres, 90 s, chave do `localStorage`), textos fixos, sugestões | US-10 a US-15 |
| `src/api/client.ts` | `askQuestion` (`POST /v1/ask`), `ApiRequestError`, validação da resposta, classificação de erros, tempo limite de 90 s | US-11 |
| `src/api/errorMessages.ts` | Textos fixos em português por `ErrorKind` | US-11 |
| `src/state/conversationRules.ts`, `questionValidation.ts` | `deriveTitle`, `normalizeRename`, `dedupeSources`, `sortConversations`, `validateQuestion` | US-11, US-12, US-14 |
| `src/state/conversationsReducer.ts` | Reducer com 9 ações, `createConversation`, `createInitialState`, `canRetryConversation` | US-10, US-14, US-15 |
| `src/state/ConversationsContext.tsx`, `src/state/ids.ts` | Provedor (grava no `localStorage`, aviso de falha, trava de chamada por conversa), ids e hora injetáveis | US-14, US-15 |
| `src/storage/persistence.ts`, `conversationStorage.ts` | `serializeState` e `parseState` (nunca lançam exceção), leitura e gravação seguras | US-15 |
| `src/hooks/useChat.ts` | Fluxo de envio, nova tentativa, resposta entregue à conversa de origem | US-10, US-11 |
| `src/components/Chat/` | `ChatWindow`, `MessageList`, `MessageBubble`, `SourceList`, `Notice`, `LoadingIndicator`, `ChatInput`, `SuggestedQuestions`, `MarkdownContent` (+ CSS Modules) | US-10 a US-13 |
| `src/components/Sidebar/` | `Sidebar`, `ConversationItem` (renomear na linha), `ConfirmDialog` (+ CSS Modules) | US-14 |
| `src/components/ErrorBoundary.tsx`, `src/App.tsx`, `src/main.tsx`, `src/styles/global.css` | Composição, tela de erro em vez de tela em branco, tokens de cor com contraste conferido | US-11 |

## Testes (ao lado do código)

| Tipo | Arquivos | O que cobrem |
|---|---|---|
| Propriedades (`fast-check`) | `conversationRules.properties.test.ts`, `conversationsReducer.properties.test.ts`, `persistence.properties.test.ts`, `errorMessages.test.ts` | INV-01 a INV-09 em sequências de até 25 ações, `sessionId` imutável, no máximo uma conversa vazia, `delete` sempre deixa conversa ativa, round-trip de `serializeState`/`parseState`, entrada arbitrária e corrompida, títulos, validação do texto, `dedupeSources` idempotente, ordenação, `createInitialState` para qualquer estado persistido |
| Exemplos de lógica | `conversationRules.test.ts`, `questionValidation.test.ts`, `conversationsReducer.test.ts`, `persistence.test.ts`, `conversationStorage.test.ts`, `client.test.ts` | Regras BR-CNV, BR-ENV, BR-ERR, BR-PER; cada `ErrorKind`; tempo esgotado e cancelamento com relógio simulado |
| Componentes | `MarkdownContent`, `SourceList`, `MessageList`, `ChatInput`, `SuggestedQuestions`, `ConfirmDialog`, `Sidebar`, `ErrorBoundary` | Markdown seguro (links `javascript:`, imagens e HTML bruto), contador a partir de 1800 e bloqueio acima de 2000, Enter e Shift+Enter, foco preso no diálogo, renomear e excluir |
| Integração da tela | `App.test.tsx` | Enviar e receber com Markdown e fontes, carregamento, erros e "Tentar novamente", `session_reset` com aviso único, recarga, armazenamento corrompido, pergunta sem resposta, falha de gravação, várias conversas, resposta depois de trocar ou excluir a conversa, teclado e nomes acessíveis |

PBT: geradores de domínio em `src/test/arbitraries.ts` (PBT-07), invariantes em `src/test/invariants.ts`, `fast-check` 4.10.2 (PBT-09), seed e caminho impressos em falha (PBT-08), exemplos separados das propriedades (PBT-10).

## Comandos (a partir de `frontend/`)

```powershell
npm install
npm run dev          # http://localhost:5173
npm test
npm run typecheck
npm run build
```

## Decisões e desvios em relação ao design

| Item | Decisão |
|---|---|
| `createInitialState` | Recebe também `newId`, porque a bolha `NO_RESPONSE` precisa de id e o reducer segue puro |
| Trava de chamada por conversa | `beginRequest`/`endRequest` no provedor impedem duas chamadas simultâneas na mesma conversa mesmo antes de a tela atualizar (o reducer também ignora o segundo `sendStarted`) |
| `answerReceived`/`answerFailed` | Só valem para conversa existente **e** pendente; mensagem com papel ou marcação de erro incompatível só libera a conversa |
| Foco depois de excluir | Vai para o botão "Nova conversa", pois o controle que abriu o diálogo deixou de existir |
| `parseState` | Impõe INV-08 por mensagem e descarta só a conversa inválida (BR-PER-04); remove fontes repetidas em vez de descartar |
| Pastas | Sem pasta nova em `src/` além de `test/`. Funções puras em `state/` e formato persistido em `storage/` |
| React 18 | Tipos de `ref` como `RefObject<T>` (React 18), não `RefObject<T \| null>` |
| `data-testid` | Todos os controles interativos, no padrão `{componente}-{papel}` |

## Pontos a validar no Build and Test

- Usar a interface no navegador contra o Backend real: CORS, fontes com título e arquivo, aviso de contexto reiniciado depois de reiniciar o Backend, erro e nova tentativa com o Backend parado.
- Conferir visualmente o contraste, o foco visível e o layout em 1024 px (os tokens de cor foram calculados, mas não medidos em tela).
- Confirmar a versão do Node do terminal do usuário (exigência: `^22.22.2`, `^24.15.0` ou `>=26`).
- Verificar o texto das sugestões contra as respostas reais da base.
