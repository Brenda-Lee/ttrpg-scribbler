# Listagem de funcionalidades de telas

**Objetivo principal**: permitir escrita e realizar revisão e correção de textos de acordo com as regras da gramática da língua portuguesa (PT-BR). Criação de formulários com worldbuilding com regras do mundo de fácil acesso, possibilitado exportar o texto criado em pdf estruturando de acordo com markdown e/ou html, inclusão de imagens e áudio (notas de dano, condições estipuladas, locação e personagens como flags clicáveis que abre a página sobre o personagem se existir ou cria uma em branco se a flag for criada no momento - filling labels com características essenciais, no caso de lugar, tamanho, estação, prédios, árvores, ponto de referência).

Mapa interativo (subir imagem e atrelar pontos de interesse dentro da imagem inclusa como links redirecionáveis ou hovers clicáveis). O board de quests é uma ‘ferramenta de imersão’. Um mapa de ferimentos (abre uma aba com um mapa UV de um corpo e é possível apontar locais para identificar danos tipo a tela do personagem do tarkov).

Timeline de “eventos importantes”, em exemplo o quão velho o personagem é em um período especificado. Uma listagem populada ao longo de novas adições.

Criação de fichas de personagens com características do sistema selecionado (se RPG), com os campos de biografia e outros dependendo do arco de desenvolvimento.

Glossário do projeto, em que se adicionam termos (palavras) e as caracterizam com modos de serem utilizadas (objeto, sujeito, substantivo, adjetivo, flexão de gênero, conjugação se verbo) como se fosse, de fato, um dicionário. Durante a escrita, se um termo estiver no glossário do projeto, mostra uma tela de sugestões que mostra algo como “regras da palavra”. Exemplo: Usar glamour no texto corrido e daí abrir uma caixa de texto com regras do glamour, ou o nome de um personagem e mostrar a ficha reduzida/simplificada dele com palavras-chave e o link de fácil acesso para a página completa dele no glossário. 

Requisitos:

- Opção de estilo de escrita: coloquial, ABNT, formal;
- Opção de dicionário personalizado: distinção de lowercase e uppercase e atribuição de atributos às palavras adicionadas (ex: Agosto, tratar como nome próprio);
- Similares: World Anvil, Scrivener, Novelcrafter

## Tecnologias:

- **Next.js**: Para renderização híbrida (SSR/SSG) e melhor performance.
- Electron e/ou Tauei (Rust)
- Editor de Texto: Tiptap
- **Tailwind CSS** ou **ShadCN**: Para estilização moderna e rápida.
- **Zustand** ou **Context API**: Para gerenciamento de estado leve.
- **React Query**: Para lidar com dados assíncronos e cache.
- **Node.js + Express**: Para criar uma API leve que se comunica com o banco de dados.
- **Fastify**: Alternativa ao Express, mais performática se precisar de alta eficiência.
- **SQLite**: Simples e eficiente para um servidor local sem necessidade de configuração pesada.
- **PostgreSQL**: Caso precise de um banco mais robusto e escalável futuramente.
- **Prisma ORM**: Para facilitar consultas e modelagem de dados.
- **NextAuth.js**: Se quiser login via OAuth (Google, GitHub, etc.) ou credenciais.
- **JWT + bcrypt**: Caso prefira autenticação manual.
- **pdf-lib** (Recomendado) - Mais flexível e com suporte a personalização.
- **jsPDF** - Mais simples, bom para gerar PDFs diretamente no frontend.
- **puppeteer** - Caso queira gerar PDFs mais sofisticados com base em HTML.

## Scrivener

- Serve como uma aplicação de processamento de escrita que ajuda a organizar o bruto (a escrita), a pesquisa e algumas notas. No fim é uma ferramenta de auxílio no processo criativo, como uma grande pasta.

### Características principais:

- **Outlining**: Create an outline to organize your ideas and plan your writing
- **Editing**: Use tools to correct errors, restructure sections, and more
- **Formatting**: Format your writing for screenplays, academic papers, and more
- **Research**: Manage notes, research, and metadatas
- **Templates**: Use templates for fiction, non-fiction, and screenplayse
- **Exporting**: Export your writing to a variety of formats, including Microsoft Word, PDF, and more
- Electron: Build cross-platform desktop apps with JavaScript. HTML and CSS (back-end)

# World Anvil

- Serve como…

### Características principais:

- **Outlining**: C

# Novelcrafter

- Serve como…

### Características principais:

- **Outlining**: Creating

# Entidades

| Usuário |
| --- |
| id (string) |
| nome (string) |
| email (string) |
| senha (string) |
|  |
| criação (datetime) |
|  |

| Sistemas |
| --- |
| id (string) |
| nome (string) |
| regras (schema)* |
|  |

| Jogo (Ou Campanha) |
| --- |
| id (string) |
| proprietário (usuario.id) |
| título (string) |
| sistema (tormenta20, d&d…) |

| Jogador |
| --- |
| id_user (usuario.id) |
| id_game (jogo.id) |
| role (dungeon master, player) |
|  |
|  |

Requisitos:

Usuários podem:

- criar uma conta na plataforma
- autenticar-se na plataforma
- criar um **jogo**
- fechar um **jogo** (status de ativo/inativo)
- listar os **jogos** criados/vinculados
- listar os sistemas

Jogadores (DM) podem:

- atrelar jogadores (player) a um jogo
- visualizar as informações sensíveis (fichas de monstros, fichas de vilões, fichas de NPC, achados de mapa…) do jogo
- criar fichas de personagem (NPCs e monstros)
- listar todas as fichas de todos os jogos criados pelo usuário

Jogadores (Player) podem:

- após vinculado a um jogo, criar uma ficha de personagem
- visualizar e editar as informações da sua ficha de personagem atrelada aos jogos