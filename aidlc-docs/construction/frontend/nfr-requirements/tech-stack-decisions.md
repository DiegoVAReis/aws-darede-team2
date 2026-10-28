# Decisões de Tecnologia: Frontend

Versões consultadas no registro npm em 2026-10-28 e resolvidas juntas em um projeto temporário (`npm install --package-lock-only`, sem conflitos). Todas fixadas com versão exata no `frontend/package.json`. O `package-lock.json` é versionado.

## Dependências de execução

| Pacote | Versão | Uso | Licença |
|---|---|---|---|
| `react` | 18.3.1 | Interface (React 18, conforme `tech-env.md`) | MIT |
| `react-dom` | 18.3.1 | Renderização no navegador | MIT |
| `react-markdown` | 10.1.0 | Renderização do Markdown das respostas, sem HTML bruto | MIT |
| `remark-gfm` | 4.0.1 | Tabelas, listas de tarefas e riscado no Markdown | MIT |

## Dependências de desenvolvimento

| Pacote | Versão | Uso | Licença |
|---|---|---|---|
| `vite` | 8.3.5 | Servidor de desenvolvimento e build | MIT |
| `@vitejs/plugin-react` | 6.1.2 | Suporte a React no Vite | MIT |
| `typescript` | 5.9.3 | TypeScript 5.x (a versão 7 existe no registro, mas o requisito é 5.x) | Apache 2.0 |
| `@types/react` | 18.3.31 | Tipos do React 18 | MIT |
| `@types/react-dom` | 18.3.7 | Tipos do ReactDOM 18 | MIT |
| `@types/node` | 24.19.2 | Tipos do Node para `vite.config.ts` e para o Vitest (par exigido pelo Vitest) | MIT |
| `vitest` | 5.0.5 | Executor de testes | MIT |
| `jsdom` | 30.1.3 | Ambiente de DOM para os testes de componentes | MIT |
| `@testing-library/react` | 16.3.3 | Testes de componentes | MIT |
| `@testing-library/dom` | 10.4.2 | Par exigido pelo `@testing-library/react` | MIT |
| `@testing-library/user-event` | 14.6.8 | Simulação de teclado e clique | MIT |
| `@testing-library/jest-dom` | 7.0.1 | Asserções de DOM e de acessibilidade | MIT |
| `fast-check` | 4.10.2 | Testes baseados em propriedades (PBT-09) | MIT |

Todas as licenças são permissivas (MIT ou Apache 2.0). Diferente do Hypothesis do Backend (MPL 2.0), o `fast-check` não precisa de exceção.

Não entram: biblioteca de estado (usa `useReducer` e Context), biblioteca de rotas (tela única), biblioteca de UI (CSS Modules próprio), biblioteca de datas, biblioteca de HTTP (usa `fetch`), `@vitest/coverage-*` (sem meta de cobertura no front), ESLint e Prettier.

## Seleção do framework de PBT (PBT-09)

| Critério | `fast-check` |
|---|---|
| Linguagem | TypeScript, com tipos nativos |
| Geradores de domínio customizados | Sim (`fc.record`, `fc.array`, `fc.oneof`, `fc.constantFrom`, `fc.letrec` para estruturas recursivas) |
| Shrinking automático | Sim, ligado por padrão |
| Reprodução por seed | Sim: em falha imprime `seed` e `path`; reexecução com `fc.assert(prop, { seed, path })` |
| Integração com o runner | Sem plugin: `fc.assert(fc.property(...))` dentro de `it(...)` do Vitest |
| Sequências de ações para o reducer | Sim (`fc.array(actionArbitrary)` aplicado em `reduce`) |

Configuração global prevista em um arquivo de setup dos testes: `fc.configureGlobal({ numRuns: 100 })`.

## Empacotamento e ambiente

- Pasta `frontend/` com `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` e `src/`.
- Scripts previstos: `dev` (`vite`), `build` (`tsc --noEmit && vite build`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`) e `test:watch` (`vitest`).
- Campo `engines` com a faixa de Node da seção "Premissas e riscos" do `nfr-requirements.md`.
- Gerenciador: `npm` (comandos `npm install`, `npm run dev`, `npm test`).
- `node_modules/` e `dist/` já estão no `.gitignore` da raiz.

## Escolhas de implementação com impacto de design

| Tema | Decisão |
|---|---|
| Servidor de desenvolvimento | Porta 5173 com `strictPort: true`. Se a porta estiver ocupada, o Vite falha em vez de trocar de porta, porque o CORS do Backend só libera `http://localhost:5173` |
| Compilação | Alvo `es2022`; TypeScript com `strict: true` e `jsx: react-jsx` |
| Estado | `useReducer` + Context. Funções puras e reducer sem efeitos, recebendo ids e hora de fora (testáveis por propriedades) |
| Estilo | CSS Modules (suporte nativo do Vite), fontes do sistema, sem CDN |
| Markdown | `react-markdown` com `remark-gfm`, `skipHtml`, componente próprio para `a` (só `http` e `https`, `target="_blank"`, `rel="noopener noreferrer"`) e para `img` (mostra o texto alternativo, sem carregar) |
| HTTP | `fetch` nativo com `AbortController` para o tempo limite de 90 s |
| Ids | `crypto.randomUUID()` (sessão e conversa), com função `generateId` injetável e alternativa para ambientes de teste sem a API |
| Testes de componentes | Vitest com `environment: "jsdom"`, `globals: false`, arquivo de setup com `@testing-library/jest-dom` e `fc.configureGlobal` |
| Organização dos testes | Arquivos `*.test.ts(x)` ao lado do código e `*.properties.test.ts` para PBT; geradores em `src/test/arbitraries.ts` |
| Sem pasta nova em `src/` | `api/`, `storage/`, `state/`, `hooks/`, `components/`, `types.ts`, `constants.ts`, `App.tsx`, `main.tsx` (mais `test/` para suporte de testes) |
