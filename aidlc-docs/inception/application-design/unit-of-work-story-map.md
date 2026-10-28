# Mapa de Histórias por Unidade

## Atribuição

| História | Título | Grupo | Persona | Unidade | Componentes principais |
|---|---|---|---|---|---|
| US-01 | Indexar a base de conhecimento | F1 | Marcos | Backend | BC-07, BC-05, BC-06, BC-04 |
| US-02 | Reindexar sem duplicar | F1 | Marcos | Backend | BC-07, BC-06, BC-05 |
| US-03 | Saber se a base está indexada | F1 | Marcos | Backend | BC-07, BC-08, BC-13 |
| US-04 | Receber resposta fundamentada na base | F2 | Carla | Backend | BC-13, BC-11, BC-09, BC-08, BC-03, BC-02 |
| US-05 | Receber as fontes da resposta | F2 | Carla | Backend | BC-08, BC-10, BC-11 |
| US-06 | Ser avisado quando a base não tem a informação | F2 | Seu Altair | Backend | BC-08, BC-09, BC-10 |
| US-07 | Receber a resposta no idioma da pergunta | F2 | Seu Altair | Backend | BC-09 |
| US-08 | Fazer perguntas de acompanhamento | F3 | Carla | Backend | BC-10, BC-09, BC-11 |
| US-09 | Manter conversas independentes | F3 | Seu Altair | Backend | BC-10, BC-11 |
| US-10 | Ser avisado quando o contexto foi reiniciado | F3 | Carla | Backend (API) e Frontend (aviso) | BC-10, BC-11, FC-03, FC-04, FC-07 |
| US-11 | Conversar em uma interface estilo chat | F4 | Carla | Frontend | FC-05, FC-07, FC-08, FC-10, FC-01 |
| US-12 | Ver o título e o arquivo de cada fonte | F4 | Carla | Frontend | FC-07 (`SourceList`) |
| US-13 | Começar por perguntas sugeridas | F4 | Seu Altair | Frontend | FC-09 |
| US-14 | Gerenciar conversas na barra lateral | F4 | Carla | Frontend | FC-06, FC-03 |
| US-15 | Recuperar conversas ao recarregar a página | F4 | Seu Altair | Frontend | FC-02, FC-03 |
| US-16 | Subir o assistente localmente | F5 | Marcos | Frontend (entrega); Backend deixa as notas | README, BC-13 (`/health`), BC-01 |
| US-17 | Compartilhar a documentação sem expor segredos | F5 | Marcos | Frontend (entrega); Backend deixa as notas | README, `.gitignore` |

**Observação sobre US-10:** o comportamento tem duas partes. O Backend devolve `session_reset: true` quando recebe um `session_id` desconhecido (Unidade 1). O Frontend mostra o aviso discreto e mantém as mensagens na tela (Unidade 2). A história é aceita só depois das duas, e a verificação conjunta ocorre no Build and Test.

## Resumo por unidade

| Unidade | Histórias | Quantidade |
|---|---|---|
| Backend | US-01, US-02, US-03, US-04, US-05, US-06, US-07, US-08, US-09, US-10 (parte da API) | 10 |
| Frontend | US-10 (parte da interface), US-11, US-12, US-13, US-14, US-15, US-16, US-17 | 8 (US-10 contada nas duas) |

Total de histórias distintas: 17. Todas estão atribuídas a pelo menos uma unidade.

## Cobertura de requisitos por unidade

| Requisito | Unidade |
|---|---|
| FR-01 Ingestão | Backend |
| FR-02 Recuperação | Backend |
| FR-03 Agente | Backend |
| FR-04 Sessões | Backend (FR-04.5 no servidor); Frontend usa o `session_id` e o `session_reset` |
| FR-05 API | Backend |
| FR-06 Front-end | Frontend |
| FR-07 Documentação | Frontend (README raiz), com notas do Backend |
| NFR-01 a NFR-07 | Ambas (testes, `ruff`, segurança básica e logs no Backend; acessibilidade, Markdown seguro e testes de componentes no Frontend) |

## Ordem de implementação por unidade

**Backend:** US-01, US-02, US-03, US-04, US-05, US-06, US-07, US-08, US-09, US-10.
**Frontend:** US-11, US-12, US-13, US-14, US-15, US-10 (aviso), US-16, US-17.
