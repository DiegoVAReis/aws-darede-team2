# Personas: Assistente de Conhecimento Interno da Anyone Agro Business

Os nomes abaixo são fictícios, usados só para dar vida às personas. Fonte: `vision.md` (usuários-alvo) e `requirements.md`.

## Resumo

| Persona | Tipo | Usa o sistema para | Grupos de funcionalidades |
|---|---|---|---|
| Carla, a Colaboradora | Usuária final | Tirar dúvidas sobre procedimentos, normas, catálogos e políticas internas | F2, F3, F4 |
| Seu Altair, o Cooperado | Usuário final | Consultar serviços, crédito, seguros, insumos e máquinas sem ligar ou ir à loja | F2, F3, F4 |
| Marcos, o Mantenedor da base | Usuário técnico | Preparar, atualizar e verificar a base de conhecimento e subir o assistente localmente | F1, F5 |

---

## Persona 1. Carla, a Colaboradora

**Perfil:** colaboradora recém-contratada, vinda de outra área da Anyone Agro Business. Usa o computador no dia a dia, mas não conhece os sistemas internos nem onde cada documento fica.

**Objetivos**
- Resolver dúvidas rápidas sobre procedimentos, normas sanitárias, catálogos técnicos e políticas de TI sem interromper colegas.
- Ter certeza de estar usando a versão oficial da informação.
- Continuar uma linha de raciocínio com perguntas curtas ("e a das colheitadeiras?").

**Dores hoje**
- O conhecimento está espalhado em muitos documentos e sistemas.
- Depende de colegas ocupados e corre o risco de usar versão desatualizada.

**Contexto de uso:** navegador no computador de trabalho, interface de chat. Faz várias perguntas seguidas e volta a conversas anteriores.

**O que mede sucesso:** achar a resposta em minutos e saber de qual documento ela veio.

**Frases típicas**
- "Onde está o procedimento para abrir um chamado de manutenção?"
- "E se eu precisar da peça com urgência?"

**Histórias principais:** US-04, US-05, US-08, US-10, US-11, US-12, US-14. As demais histórias de usuário final (US-06, US-07, US-09, US-13, US-15) também se aplicam a ela, pois as duas personas usam a mesma interface.

---

## Persona 2. Seu Altair, o Cooperado

**Perfil:** produtor associado à cooperativa. Conhece bem o campo, mas tem pouca familiaridade com ferramentas digitais. Quer resposta direta e em linguagem simples.

**Objetivos**
- Entender serviços da cooperativa, crédito rural, seguros agrícolas, insumos e máquinas em um só lugar.
- Saber quando a informação não está nos documentos da empresa, para não tomar uma decisão achando que é regra oficial.

**Dores hoje**
- Precisa ligar ou ir até a loja para dúvidas simples.
- A informação está fragmentada entre áreas.

**Contexto de uso:** computador ou tablet, em sessões curtas. Gosta de perguntas sugeridas para começar e precisa de uma tela clara, sem ter que entrar com login ou chave.

**O que mede sucesso:** a resposta é clara e deixa explícito de onde veio, ou avisa que não veio da base interna.

**Frases típicas**
- "Quais são as modalidades de custeio?"
- "Qual a carência do defensivo antes da colheita?"

**Histórias principais:** US-06, US-07, US-09, US-13, US-15. As demais histórias de usuário final (US-04, US-05, US-08, US-10, US-11, US-12, US-14) também se aplicam a ele, pois as duas personas usam a mesma interface.

---

## Persona 3. Marcos, o Mantenedor da base

**Perfil:** analista de tecnologia que cuida do assistente. Sabe usar terminal, Python e Node. No workshop, é quem roda o sistema na própria máquina e mantém os documentos de `anyone_kb/`.

**Objetivos**
- Indexar os 15 documentos e reindexar quando algum mudar, sem duplicar dados.
- Saber rapidamente se a base está indexada e quantos chunks existem.
- Subir backend e front seguindo um README claro e sem expor a API Key do Bedrock.

**Dores hoje**
- Sem uma ingestão repetível, a base fica desatualizada ou duplicada.
- Medo de vazar credenciais ao compartilhar instruções.

**Contexto de uso:** terminal, editor de código e navegador. Executa a ingestão uma vez antes do uso e de novo quando a base muda.

**O que mede sucesso:** a base indexada corretamente, o sistema no ar em poucos comandos e nenhum segredo no repositório.

**Frases típicas**
- "Atualizei dois documentos. Posso reindexar sem apagar tudo?"
- "O `.env` do facilitador já está na raiz. O que falta para subir?"

**Histórias principais:** US-01, US-02, US-03, US-16 e US-17. As histórias de US-16 e US-17 descrevem resultados de uso (subir o assistente e documentar o `.env` sem segredos), não tarefas técnicas de implementação.

---

## Mapa de personas x capacidades

| Capacidade | Carla | Seu Altair | Marcos |
|---|---|---|---|
| Ingestão e reindexação da base (FR-01) |  |  | Sim |
| Perguntar e receber resposta com fontes (FR-02, FR-03, FR-05) | Sim | Sim |  |
| Conversa com memória (FR-04) | Sim | Sim |  |
| Interface de chat e conversas (FR-06) | Sim | Sim |  |
| Subir o sistema e documentação (FR-07) |  |  | Sim |

As duas personas de usuário final compartilham as mesmas capacidades. A divisão de "histórias principais" acima só indica qual delas representa melhor cada história.
