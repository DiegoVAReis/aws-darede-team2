# Intent: Assistente de Conhecimento Interno da Anyone Agro Business

**Author:** Matheus Requino    **Date:** 2026-10-21    **Status:** Draft

**Type:** Greenfield    **Target release:** Solução local funcional ao final do workshop de 1 dia

---

## P - Problem

### Context

A Anyone Agro Business é uma empresa (fictícia, usada para fins de demonstração) que integra cooperativa de produtores, indústria de proteína bovina, revenda de máquinas agrícolas, indústria de insumos e usina de bioenergia. Com operações tão diversas, o conhecimento interno — procedimentos, normas sanitárias, catálogos técnicos, políticas de crédito e seguros, compliance ambiental e políticas de TI — fica espalhado em muitos documentos e sistemas. Colaboradores, especialmente os recém-chegados, e cooperados perdem tempo procurando a informação certa ou recorrem a colegas ocupados, e muitas vezes agem com base em versões desatualizadas. Este é um projeto didático/fictício, criado para demonstrar a metodologia AI-DLC da AWS em um workshop de 1 dia, com narrativa próxima à realidade das empresas participantes (cooperativas, frigoríficos, máquinas, insumos, usinas e TI corporativa).

### Problem statement

Hoje, colaboradores e cooperados da Anyone Agro Business precisam garimpar informação em documentos dispersos, sistemas diferentes e no conhecimento de colegas quando têm uma dúvida sobre procedimentos, normas, catálogos ou políticas internas. Isso torna a resposta lenta, gera retrabalho e aumenta o risco de decisões baseadas em informação desatualizada. Eles precisam de uma forma de obter respostas confiáveis, específicas e imediatas sobre o conhecimento interno da empresa, num só lugar, com indicação da fonte.

**How Might We:** Como poderíamos oferecer ao colaborador e ao cooperado respostas confiáveis e imediatas sobre procedimentos, normas, catálogos e políticas internas, centralizando o conhecimento disperso numa única fonte com citação da origem, para que ele resolva a dúvida em minutos e aja sempre pela versão oficial?

**North Star:** Entregar um assistente de conhecimento interno funcional (local) ao final do workshop de 1 dia, capaz de reduzir o tempo de busca do colaborador de horas espalhadas em múltiplas fontes para minutos numa única interface, sempre citando o documento de origem, a fim de transformar conhecimento disperso em respostas confiáveis e rastreáveis.

### Target users

| User type | What they need | Pain today |
|---|---|---|
| Colaborador (novo ou de outra área) | Respostas rápidas e confiáveis sobre procedimentos, normas e políticas internas, com a fonte | Conhecimento disperso em muitos documentos e sistemas; depende de colegas; risco de usar versão desatualizada |
| Cooperado | Informação sobre serviços, crédito, seguros, insumos e máquinas, num só lugar | Precisa ligar ou ir à loja para dúvidas simples; informação fragmentada |

### Success metrics

> Nota: projeto didático/fictício, sem baseline real. Métricas de valor de negócio marcadas como N/A por decisão do facilitador; mantida apenas a métrica de demonstração do workshop.

| Metric | Target | Measured how |
|---|---|---|
| RAG funcional respondendo com base de conhecimento interna curada ao final do workshop | Sim — solução local operante, respostas citando fonte | Demonstração ao vivo no fim do dia |
| Métricas de valor de negócio (tempo de busca, nº de fontes, confiança) | N/A — projeto didático | — |

---

## R - Requirements

### In scope (MVP)

- Chatbot RAG especializado no conhecimento interno da Anyone Agro Business, respondendo perguntas pontuais sobre procedimentos, normas, catálogos técnicos e políticas
- Respostas com citação de fonte, apoiadas em base de conhecimento interna curada
- Base de conhecimento **local**: pacote de ~15 documentos (~100 linhas cada) entregue aos participantes como pasta zipada, usado para configurar a Knowledge
- Agente desenvolvido em Python com framework Strands Agents
- Interface em ReactJS
- Execução totalmente local (Strands Agent + front-end)

### Out of scope (explicit)

| Excluded feature | Reason | Target phase |
|---|---|---|
| Integração com sistemas corporativos reais (ERP, CRM) | Escopo ambicioso demais para 1 dia | Phase 2 |
| Atualização automática/sincronização da base | Fora do foco do RAG com base curada local | Phase 2 |
| Autenticação / multiusuário / perfis de acesso | Não necessário para demonstração local | Phase 2 |
| Deploy em produção | Objetivo é demonstrar AI-DLC localmente | Phase 3+ |
| Base de conhecimento hospedada/gerenciada | Decisão por opção local para evitar custos | Phase 2 |

### Constraints

- **Must use:** Python + Strands Agents (agente); ReactJS (front-end); base de conhecimento local (vector store local a definir)
- **Must not change (brownfield only):** N/A — greenfield
- **Compliance / security:** Sem restrições específicas (projeto didático; a base não contém dados pessoais reais)
- **Non-functional targets:** Execução local; acesso ao Bedrock via API Key compartilhada fornecida pelo facilitador (participante não provisiona AWS)

### Assumptions

- O **facilitador fornece as credenciais necessárias** (Amazon Bedrock API Key compartilhada, via arquivo `.env` enviado por e-mail) para viabilizar a integração com a camada de IA — **não há provisionamento de AWS durante o evento**
- Os ~15 documentos da base são preparados e entregues (zip) antes/durante o workshop
- Participantes têm ambiente mínimo configurado (Python, Node.js) e colocam o `.env` recebido na raiz do projeto
- O escopo é concluível em 1 dia com a base pré-pronta e a stack definida

---

## F - Forward plan

### Open questions (pre-declared ambiguities)

- ~~Qual provedor/modelo por trás do Bedrock e qual modelo de embeddings usar para o RAG local~~ → **resolvido:** Amazon Nova Pro (`amazon.nova-pro-v1:0`) + Titan Embeddings v2 (`amazon.titan-embed-text-v2:0`), acesso via API Key fornecida pelo facilitador
- Opção de deploy remoto mínimo (a pesquisar em conjunto) — o vision assume execução local
- Formato de configuração da Knowledge a partir do pacote zipado (qual vector store local: ex. FAISS, Chroma, etc.)
- Estrutura e tópicos finais dos ~15 documentos da base de conhecimento

### Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Tempo de 1 dia insuficiente para RAG completo | H | M | Entregar base pré-pronta (zip) e stack definida antes do dia |
| Participantes sem ambiente configurado (Python, Node) | H | M | Enviar pré-requisitos e checklist de setup antes do evento; office hours de setup na segunda (26/10) |
| Base de conhecimento com qualidade/cobertura insuficiente | M | L | Curar os ~15 documentos previamente com temas-chave (máquinas, carne, cooperativa, insumos, crédito, compliance, TI) |
| API Key compartilhada exposta ou esgotamento de créditos | M | M | Key de validade curta (expira logo após o evento) fornecida pelo facilitador; revogar após o workshop; monitorar uso |

### Roll-out sketch

- **Phase 1 (MVP):** Assistente de conhecimento interno local com base curada (zip), respostas com fonte, Python + Strands + React — construído no workshop
- **Phase 2:** Integração com sistemas corporativos, sincronização da base, multiusuário com perfis de acesso, base gerenciada
- **Phase 3+:** Deploy remoto/produção

### Stakeholders and approvals

| Role | Name | Approval needed on |
|---|---|---|
| Facilitador | Matheus Requino | Condução do workshop, problema e escopo do MVP |
| Sponsor | N/A | — |
| Product owner | N/A | — |
| Tech lead | N/A | — |
| Security | N/A | — |
| Participantes | Participantes do workshop | Implementação durante o evento |

---

## Technical Context (addendum)

> Decisões técnicas-chave acordadas na pré-sessão. Não substitui o `tech-env.md` completo — os detalhes (NFR, arquitetura, estratégia de testes, allow/disallow de serviços) são responsabilidade do time na Requirements Analysis / Infra Design do AI-DLC.

- **Project type:** Greenfield
- **Stack:** Python + Strands Agents (agente); ReactJS (front-end)
- **Execução:** local (Strands Agent + front-end); Bedrock acessado via **API Key compartilhada** fornecida pelo facilitador (arquivo `.env`), sem conta AWS do participante
- **Autenticação:** `AWS_BEARER_TOKEN_BEDROCK` (Bearer token) no `.env`; `boto3` >=1.39 reconhece automaticamente. Participantes não provisionam AWS durante o evento
- **Modelos:** Amazon Nova Pro (`amazon.nova-pro-v1:0`) + Titan Embeddings (`amazon.titan-embed-text-v2:0`), região `us-east-1`
- **Knowledge base:** local, pacote de ~15 documentos (~100 linhas) em pasta zipada — conhecimento interno da Anyone Agro Business
- **Compliance:** sem restrições específicas (didático)
- **Código de exemplo:** não existe (greenfield) — o time deverá criar exemplos de endpoint, função e teste
- **A finalizar pela engenharia no `tech-env.md`:** vector store local, modelo de embeddings, modelo Bedrock, opção de deploy remoto mínimo
