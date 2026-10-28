# NFR Requirements: Frontend

## Valores fechados (pendências do requirements.md §10)

| Item | Valor | Onde se configura |
|---|---|---|
| Versões das dependências | Exatas (sem `^` nem `~`) no `package.json`; `package-lock.json` versionado (o `.gitignore` não o ignora) | `frontend/package.json` (ver `tech-stack-decisions.md`) |
| Framework de testes de propriedades | `fast-check` 4.10.2 com Vitest | `tech-stack-decisions.md` |
| Porta do servidor de desenvolvimento | 5173 com `strictPort: true`, para nunca sair da origem liberada no CORS do Backend | `vite.config.ts` |
| URL base da API | `http://localhost:8000`, sobrescrevível por `VITE_API_BASE_URL` | `src/constants.ts` e `.env` do front (opcional) |
| Tempo limite da pergunta | 90 s | `src/constants.ts` (`REQUEST_TIMEOUT_MS`) |
| Limite de texto da pergunta | 2000 caracteres | `src/constants.ts` (`MAX_TEXT_LENGTH`) |
| Cobertura de testes | Sem meta numérica no front (a meta de 80% do `tech-env.md` vale para o Backend). Todos os critérios de aceitação de US-10 a US-15 têm teste | `requirements.md` NFR-06 |

## Requisitos não funcionais do Frontend

### Desempenho e escala
- NFR-F-01: uso individual em um navegador, uma conversa por vez na tela. Sem meta de vazão nem de tempo de resposta (o tempo é do Backend e do Bedrock).
- NFR-F-02: a interface deve continuar responsiva com centenas de mensagens guardadas. A lista não usa virtualização; a gravação no `localStorage` serializa o estado inteiro a cada mudança relevante (BR-PER-02), o que é aceitável para o volume esperado.
- NFR-F-03: o indicador de carregamento aparece assim que a pergunta é enviada e a interface não trava durante a espera (a chamada é assíncrona).

### Disponibilidade e confiabilidade
- NFR-F-04: o front nunca fica preso em "carregando". Toda chamada termina em sucesso, erro tratado ou tempo esgotado (90 s) (BR-ERR-02).
- NFR-F-05: sem retentativa automática; a nova tentativa é uma ação do usuário (BR-ERR-04).
- NFR-F-06: armazenamento ausente, bloqueado, cheio ou corrompido não impede o uso. O app inicia vazio ou segue em memória e avisa o usuário (BR-PER-03, BR-PER-06).
- NFR-F-07: o front funciona com o Backend fora do ar, mostrando o erro `NETWORK` na conversa.

### Segurança (checklist básico, NFR-03)
- NFR-F-08: nenhum segredo no código, no `package.json` nem no pacote gerado. As variáveis `VITE_*` são públicas no navegador, então só `VITE_API_BASE_URL` é usada e ela não pode conter credencial.
- NFR-F-09: o front não acessa o Bedrock. Só chama a URL base da API (BR-UI-07).
- NFR-F-10: o conteúdo vindo do modelo nunca é inserido como HTML (sem `dangerouslySetInnerHTML`). O Markdown ignora HTML bruto, só abre links `http` e `https` com `rel="noopener noreferrer"` e não carrega imagens (BR-UI-05, BR-UI-06).
- NFR-F-11: o texto de erro mostrado ao usuário é fixo e não repete o `message` da API (BR-ERR-07).
- NFR-F-12: o texto das perguntas e das respostas não vai para o console nem para logs. O console recebe apenas avisos sem conteúdo (por exemplo, falha ao gravar no armazenamento).
- NFR-F-13: dependências com licença permissiva (MIT, Apache ou BSD). Todas as escolhidas são MIT, exceto `typescript`, que é Apache 2.0.
- NFR-F-14: sem cookies, sem rastreamento e sem chamadas a terceiros (fontes, CDN, analytics). Fontes do sistema e recursos locais.

### Manutenibilidade e testes
- NFR-F-15: `vitest run` com testes de componentes (React Testing Library) e testes de propriedades, todos passando.
- NFR-F-16: `tsc --noEmit` sem erros, com `strict` ligado. É a verificação estática do front (`npm run typecheck`).
- NFR-F-17: testes baseados em propriedades com `fast-check` para as funções puras e o reducer listados em `business-logic-model.md`, seção 7. Em caso de falha, o `fast-check` imprime a seed e o caminho do contraexemplo; para reproduzir, passar `{ seed, path }` ao `fc.assert` (PBT-08). Geradores de domínio em um único módulo (PBT-07).
- NFR-F-18: testes de exemplo e de propriedades ficam em arquivos separados (`*.test.ts(x)` e `*.properties.test.ts`), conforme PBT-10.
- NFR-F-19: nenhum teste chama o Backend real. O `fetch` é sempre simulado; a integração real é verificada no Build and Test.
- NFR-F-20: tempo e geração de ids são injetáveis nas funções e hooks que os usam, para testes determinísticos.

### Usabilidade e acessibilidade
- NFR-F-21: interface em português do Brasil (BR-UI-01).
- NFR-F-22: acessibilidade básica (FR-06.10, BR-A11Y-01 a BR-A11Y-06): elementos semânticos, rótulos, foco visível, teclado completo, região `aria-live` para respostas.
- NFR-F-23: contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e bordas de controles.
- NFR-F-24: a animação do indicador de carregamento respeita `prefers-reduced-motion`.
- NFR-F-25: navegadores atuais (Chrome, Edge, Firefox e Safari em versões recentes). O código usa `crypto.randomUUID` (disponível em `localhost`) e alvo de compilação `es2022`.
- NFR-F-26: tela mínima suportada: notebook com 1024 px de largura. Layout de duas colunas (barra lateral e chat). Adaptação para celulares não está no escopo.

### Observabilidade
- NFR-F-27: sem telemetria. Erros inesperados de renderização não são enviados a lugar nenhum. Um limite de erro (`ErrorBoundary`) mostra "Algo deu errado. Recarregue a página." em vez de uma tela em branco; conversas guardadas permanecem no navegador.

## Premissas e riscos do ambiente

| Item | Situação |
|---|---|
| Node.js | Requer `^22.22.2`, `^24.15.0` ou `>=26`. O limite vem do `jsdom` 30 (`^22.22.2 || ^24.15.0 || >=26`) e do Vitest 5 (`^22.12.0 || ^24.0.0 || >=26.0.0`); o Vite 8 aceita `^20.19.0 || >=22.12.0`. O terminal do assistente tem Node 24.15.0 e npm 11.12.1. A versão do seu terminal ainda precisa ser confirmada. O `package.json` declarará `engines` para o npm avisar quando a versão for menor |
| Acesso à internet na primeira execução | Necessário para `npm install` |
| Resolução das versões | As versões fixadas foram resolvidas juntas em um projeto temporário com `npm install --package-lock-only`, sem conflitos de dependências de pares. Os pacotes não foram instalados nem executados |
| Versões novas fora do pedido | O registro npm já oferece React 19 e TypeScript 7. O projeto fica em React 18.3.1 (requisito do `tech-env.md`) e TypeScript 5.9.3 (requisito: 5.x) |
| Execução dos comandos | O assistente consegue rodar `npm` neste ambiente, mas a validação final no seu terminal fica para o Build and Test |
| Lint do front | Sem ESLint nem Prettier: `requirements.md` NFR-06 exige `ruff` só para Python. O front usa `tsc` como verificação estática. Pode ser acrescentado depois, se você quiser |
