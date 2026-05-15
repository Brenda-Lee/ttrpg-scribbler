Plano de implementação — TTRPG Scribbler (base do projeto)

 Context

 O repositório ttrpg-app está hoje em estado de template default do Next.js: apenas app/page.tsx (boilerplate da Vercel),
 app/layout.tsx, app/globals.css e um único componente frontend/components/Tiptap.jsx com <p>Hello World 🌎️</p>. Não há
 rotas, modelos de dados, estado, persistência, design system, nem qualquer dos domínios descritos em sourceMaterial/Listagem
  de funcionalidades de telas …md.

 A meta agora é reconfigurar o esqueleto do projeto para sustentar a ideia base — um compendium de escrita para escritores de
  fantasia/RPG de mesa, na linha de Novelcrafter/Scrivener, com visual inspirado na captura sourceMaterial/Captura de tela de
  2026-05-14 20-19-30.png (layout em 3 painéis: sidebar de entidades à esquerda, lista vertical de Atos→Capítulos→Cenas no
 centro, painel direito de detalhes; top bar com tabs de seção).

 Decisões já alinhadas com a usuária:
 - Persistência: SQLite local + Prisma, acessado via API Routes do Next.js (sem backend separado).
 - Auth: Single-user local no MVP; modelo User já existe no schema mas sem fluxo de login (um usuário "owner" semeado).
 - UI: Tailwind + ShadCN/UI + lucide-react.
 - MVP: (1) shell visual + Projetos/Capítulos/Cenas + editor Tiptap; (2) Glossário com sugestões inline; (3) Fichas de
 personagem + worldbuilding básico.
 - Idioma da UI: PT-BR (alinhado com o objetivo do produto).
 - Desktop wrapper (Tauri/Electron): fora do MVP.

 ---
 Resultado esperado ao final deste plano

 1. Estrutura de pastas reorganizada (uma única árvore app/ + src/; pasta solta frontend/ removida).
 2. Tailwind v3 já configurado, ShadCN instalado e theme tokens definidos.
 3. Prisma + SQLite com schema cobrindo: User, System, Project (=Jogo/Campanha), Member, Act, Chapter, Scene, Character,
 Location, Item, GlossaryTerm, Tag, Asset.
 4. Rotas funcionais para um projeto-exemplo seedado: /projects, /projects/[id], /projects/[id]/write/[sceneId],
 /projects/[id]/glossary, /projects/[id]/characters.
 5. Shell visual igual ao mockup (top tabs + sidebar esquerda + lista central + painel direito).
 6. Editor Tiptap rico com:
   - StarterKit + Placeholder + Link + Underline + TaskList + Typography;
   - extensão custom GlossaryMention que reconhece termos do glossário ao digitar e exibe popover com as regras;
   - autosave por debouncing na cena aberta.
 7. Glossário: CRUD de termos com atributos (classe gramatical, gênero, conjugação, "tratar como nome próprio").
 8. Personagens: ficha básica (nome, papel, bio, atributos livres em JSON, avatar opcional).
 9. Estado global leve com Zustand (workspace ativo, projeto/cena selecionados, drafts não salvos).
 10. README atualizado descrevendo como rodar (npm run dev, npm run db:push, npm run db:seed).

 Tudo o que está fora desta lista (PDF export, mapa interativo, mapa de ferimentos, timeline, revisão gramatical PT-BR, mídia
  avançada, auth multi-usuário, sincronização DM↔Player, desktop wrap) vira Fases 2-4 documentadas no fim deste arquivo — não
  implementadas agora.

 ---
 Arquitetura alvo

 ttrpg-app/
 ├── app/                          # Next.js App Router (rotas + layouts)
 │   ├── layout.tsx                # root layout PT-BR, fonts, ThemeProvider
 │   ├── globals.css               # tailwind + tokens shadcn + reset tiptap
 │   ├── page.tsx                  # redireciona para /projects
 │   ├── projects/
 │   │   ├── page.tsx              # listagem de projetos (campanhas)
 │   │   ├── new/page.tsx          # criar projeto (sistema + título)
 │   │   └── [projectId]/
 │   │       ├── layout.tsx        # shell 3-painéis + top tabs
 │   │       ├── page.tsx          # overview do projeto
 │   │       ├── write/
 │   │       │   ├── page.tsx      # lista de atos/capítulos/cenas (central)
 │   │       │   └── [sceneId]/page.tsx  # editor Tiptap focado
 │   │       ├── glossary/page.tsx
 │   │       ├── characters/[characterId]/page.tsx
 │   │       ├── characters/page.tsx
 │   │       └── world/page.tsx    # locations + items
 │   └── api/
 │       ├── projects/route.ts
 │       ├── projects/[projectId]/route.ts
 │       ├── scenes/[sceneId]/route.ts            # PATCH autosave
 │       ├── glossary/[projectId]/route.ts
 │       ├── characters/[projectId]/route.ts
 │       └── ...
 ├── src/
 │   ├── components/
 │   │   ├── ui/                   # shadcn primitives (button, dialog, …)
 │   │   ├── shell/                # AppShell, TopTabs, LeftSidebar, RightPanel
 │   │   ├── editor/               # TiptapEditor, GlossaryMention ext, toolbar
 │   │   ├── projects/             # ProjectCard, ProjectForm
 │   │   ├── scenes/               # SceneCard, ChapterColumn, ActSection
 │   │   ├── glossary/             # GlossaryList, GlossaryForm, TermPopover
 │   │   └── characters/           # CharacterCard, CharacterForm
 │   ├── lib/
 │   │   ├── db.ts                 # PrismaClient singleton
 │   │   ├── utils.ts              # cn(), formatters
 │   │   └── tiptap/glossaryMention.ts
 │   ├── stores/
 │   │   └── workspace.ts          # Zustand: projeto/cena ativos, drafts
 │   └── types/                    # tipos compartilhados (derivados de Prisma)
 ├── prisma/
 │   ├── schema.prisma             # SQLite + modelos descritos abaixo
 │   ├── seed.ts                   # owner user + sistemas (D&D 5e, Tormenta20) + projeto demo
 │   └── dev.db                    # gitignored
 ├── public/                       # assets estáticos (manter only o necessário)
 ├── sourceMaterial/               # intacto
 ├── components.json               # config shadcn
 ├── tailwind.config.ts            # estendido com tokens shadcn
 └── package.json                  # scripts: dev, build, db:push, db:seed, db:studio

 A pasta frontend/ solta hoje será removida e Tiptap.jsx será substituído por src/components/editor/TiptapEditor.tsx (TS, com
  extensões reais).

 ---
 Schema Prisma (resumo)

 Arquivo: prisma/schema.prisma. Datasource SQLite (file:./dev.db). Modelos chave:

 User { id, name, email?, createdAt }
 System { id, name, slug, rulesJson Json? }           // D&D 5e, Tormenta20, …
 Project { id, ownerId, systemId?, title, summary?, status (ACTIVE|ARCHIVED), createdAt }
 Member { id, userId, projectId, role (DM|PLAYER) }   // já modelado, sem UI ainda
 Act { id, projectId, title, order }
 Chapter { id, actId, title, order, summary? }
 Scene { id, chapterId, title, order, contentJson Json, contentText, wordCount, status, updatedAt }
 Character { id, projectId, name, role (PC|NPC|VILLAIN|MONSTER), bio?, attributesJson Json?, avatarAssetId? }
 Location { id, projectId, name, description?, parentId? (auto-rel), metaJson Json? }
 Item { id, projectId, name, description?, metaJson Json? }
 GlossaryTerm {
   id, projectId, term, slug, definition,
   partOfSpeech (NOUN|VERB|ADJ|PROPER_NOUN|…),
   gender? (M|F|N), conjugationJson Json?,
   treatAsProper Boolean, caseSensitive Boolean,
   relatedCharacterId?, relatedLocationId?, relatedItemId?
 }
 Tag { id, projectId, name, color }
 Asset { id, projectId, kind (IMAGE|AUDIO), path, mime, sizeBytes }

 Relações: Project hasMany Act/Character/Location/Item/GlossaryTerm/Tag/Asset; Act hasMany Chapter; Chapter hasMany Scene.
 Índices em (projectId, slug) para GlossaryTerm e (projectId, order) onde aplicável.

 ---
 Editor Tiptap — extensões mínimas

 Arquivo: src/components/editor/TiptapEditor.tsx (substitui frontend/components/Tiptap.jsx).

 - StarterKit (parágrafo, headings, listas, bold/italic, code, blockquote, history).
 - Underline, Link, Placeholder, Typography, TaskList/TaskItem.
 - GlossaryMention (extensão custom em src/lib/tiptap/glossaryMention.ts):
   - usa o Mention do Tiptap como base + um suggestion que consulta /api/glossary/[projectId]?q=…;
   - ao inserir, grava um node com data-term-id;
   - ao clicar/hover renderiza <TermPopover/> com definição, classe gramatical, link "abrir ficha completa" (vai para
 Character/Location se ligado).
 - Salvamento: useEffect com debounce 800ms chamando PATCH /api/scenes/[sceneId] com { contentJson, contentText, wordCount }.
 - Toolbar simples no topo (bold, italic, underline, h1/h2/h3, lista, link, inserir termo do glossário).

 ---
 Shell visual (espelho da captura)

 app/projects/[projectId]/layout.tsx renderiza:

 - TopBar (src/components/shell/TopTabs.tsx): título do projeto à esquerda, tabs centrais ("Escrita", "Personagens", "Mundo",
  "Glossário", "Linha do tempo", "Exportar") implementadas como Links ativos via usePathname. Ícones do lucide-react.
 - LeftSidebar (src/components/shell/LeftSidebar.tsx): seções colapsáveis "Personagens", "Locais", "Itens" — cada uma lista
 cards com avatar/iniciais + nome + tag de tipo. Botão "+" por seção. Larguras: w-64, com overflow-y-auto.
 - CenterPanel = children da rota (lista de cenas em /write, etc.).
 - RightPanel (src/components/shell/RightPanel.tsx): aba contextual (notas da cena, propriedades do personagem selecionado).
 Começa colapsado em mobile.

 Cores e tokens iguais ao tema neutro/dark do mockup; será gerado via npx shadcn@latest init com base slate + cssVariables:
 true e ajustado no globals.css.

 ---
 Plano por fases

 Fase 0 — Higiene e fundação (rápido)

 1. Remover boilerplate: SVGs em public/ (manter só os que serão usados), conteúdo do app/page.tsx e app/layout.tsx.
 2. Mover frontend/components/Tiptap.jsx para src/components/editor/TiptapEditor.tsx em TS e apagar a pasta frontend/.
 3. Atualizar tailwind.config.ts para incluir ./src/**/* em content.
 4. Atualizar tsconfig.json paths: adicionar "@/*": ["./src/*", "./*"] consistente (ou alinhar para "@/*": ["./src/*"] +
 "@app/*": ["./app/*"] — escolher uma convenção e usar em todo lugar).
 5. Atualizar metadata em app/layout.tsx: lang="pt-BR", title "TTRPG Scribbler", description curta.

 Fase 1 — Stack base

 1. Adicionar dependências: prisma, @prisma/client, zustand, zod, clsx, tailwind-merge, class-variance-authority,
 lucide-react, @tiptap/extension-link, @tiptap/extension-underline, @tiptap/extension-placeholder,
 @tiptap/extension-typography, @tiptap/extension-task-list, @tiptap/extension-task-item, @tiptap/extension-mention,
 @tiptap/suggestion, tippy.js.
 2. npx shadcn@latest init (theme neutro/slate, RSC, app/globals.css, alias @/components, @/lib/utils).
 3. Gerar primitives ShadCN usadas no MVP: button, input, textarea, dialog, dropdown-menu, tabs, tooltip, separator,
 scroll-area, card, command, popover, avatar, badge, sheet.
 4. prisma init --datasource-provider sqlite, escrever schema.prisma conforme acima, prisma db push, prisma generate.
 5. prisma/seed.ts: criar User "owner", sistemas D&D 5e e Tormenta20, um projeto demo "A Queda de Valoran" com 1 ato, 3
 capítulos, 3-4 cenas, 5 termos de glossário e 3 personagens — para a UI já carregar com algo real.
 6. Scripts em package.json: db:push, db:seed, db:studio, prepare (gera Prisma client).

 Fase 2 — Shell + listagem de projetos

 1. app/page.tsx → redirect server-side para /projects.
 2. app/projects/page.tsx: lê via Prisma todos os projetos do owner; renderiza grid de ProjectCard + botão "Novo projeto" →
 /projects/new.
 3. app/projects/new/page.tsx: server action createProject (form com system, title, summary).
 4. app/projects/[projectId]/layout.tsx: TopTabs + LeftSidebar + <main>{children}</main> + RightPanel. Sidebar busca
 personagens/locais/itens do projeto.
 5. app/projects/[projectId]/page.tsx: overview (descrição, contagem de cenas/personagens/termos, atalhos).

 Fase 3 — Núcleo de escrita

 1. app/projects/[projectId]/write/page.tsx: renderiza ActSection por Ato; cada Ato exibe coluna ChapterColumn por capítulo;
 capítulo exibe lista vertical de SceneCard (título, snippet, status, contagem de palavras). Clique →
 /projects/[projectId]/write/[sceneId].
 2. Server actions addAct, addChapter, addScene, renameX, reorderX (drag-and-drop pode ficar para depois — começa com botões
 ↑/↓).
 3. app/projects/[projectId]/write/[sceneId]/page.tsx: carrega cena, renderiza <TiptapEditor sceneId={id}
 initialContent={contentJson} projectId={…}/>. RightPanel mostra metadados (status, tags, notas).
 4. PATCH /api/scenes/[sceneId]: validação com Zod, grava contentJson, deriva contentText (usando editor.getText() no
 cliente) e wordCount.

 Fase 4 — Glossário e mention inline

 1. app/projects/[projectId]/glossary/page.tsx: lista termos + form (GlossaryForm) em Dialog para criar/editar com todos os
 atributos (classe gramatical, gênero, conjugações JSON, treatAsProper, caseSensitive, link opcional para
 Character/Location/Item).
 2. GET /api/glossary/[projectId]?q=…: retorna termos filtrados; POST cria; PATCH/DELETE por id.
 3. Extensão GlossaryMention registrada em TiptapEditor consumindo essa API. Trigger configurável (padrão: digitação direta
 com match contra termos do projeto, não só @).
 4. TermPopover: exibe definição, atributos, "Abrir ficha" se houver entidade relacionada.

 Fase 5 — Personagens e worldbuilding básico

 1. app/projects/[projectId]/characters/page.tsx: grid de CharacterCard.
 2. app/projects/[projectId]/characters/[characterId]/page.tsx: ficha (nome, papel, bio em Tiptap mini, atributos livres
 key-value em JSON, avatar via upload local em public/uploads/ por enquanto — TODO de Asset real fica para Fase 2 do
 produto).
 3. app/projects/[projectId]/world/page.tsx: lista de Locations e Items com CRUD simples (form em Dialog). Hierarquia de
 location (parent) usando self-relation já no schema, UI fica básica (combobox de parent).

 Fase 6 — Polimento mínimo do MVP

 1. README atualizado: instalação, npm install, npm run db:push && npm run db:seed, npm run dev.
 2. Validar fluxo end-to-end com o projeto seedado: abrir, navegar, editar uma cena, criar termo, ver popover, criar
 personagem.
 3. npm run lint e npm run build passando.

 ---
 Arquivos críticos a modificar / criar

 - Modificar: app/page.tsx, app/layout.tsx, app/globals.css, tailwind.config.ts, tsconfig.json, package.json, README.md,
 .gitignore (incluir prisma/dev.db, public/uploads/).
 - Remover: frontend/components/Tiptap.jsx (após migrar) e a pasta frontend/; SVGs do public/ não usados.
 - Criar: tudo descrito em "Arquitetura alvo" acima.

 Reuso

 - Manter o componente Tiptap atual como ponto de partida (migrar conteúdo de frontend/components/Tiptap.jsx:1-15 para o novo
  TiptapEditor.tsx), apenas expandindo extensões.
 - Aproveitar o Geist/Geist_Mono já configurados em app/layout.tsx:5-13 (continuam funcionando com ShadCN).
 - A entidade Member + roles DM/PLAYER já especificada no md (sourceMaterial/Listagem … .md:95-100) entra no schema agora mas
  a UI multi-usuário só vem na fase pós-MVP.

 ---
 Verificação end-to-end

 Ao concluir o MVP, validar manualmente:


     Ao concluir o MVP, validar manualmente:

     1. npm install && npm run db:push && npm run db:seed && npm run dev → abre em http://localhost:3000.
     2. /projects lista o projeto demo seedado.
     3. Entrar no projeto → top tabs visíveis, sidebar esquerda com personagens/locais/itens populados, lista central de
     Atos→Capítulos→Cenas.
     4. Abrir uma cena → editor Tiptap carrega o conteúdo seedado; editar texto e ver autosave (toast/indicador "Salvo").
     5. Em /glossary criar um termo "Glamour" com atributo treatAsProper. Voltar a uma cena, digitar "Glamour" — popover de
     definição aparece.
     6. Em /characters criar um NPC; abrir ficha; salvar; voltar — persiste após reload.
     7. npm run lint e npm run build sem erros.

     Sem testes automatizados nesta fase (escopo MVP); adicionar Vitest + Playwright fica para Fase 2.

     ---
     Fases pós-MVP (documentadas, não implementadas agora)

     - Fase 2 — Exportação PDF: integrar puppeteer (renderizar rota /projects/[id]/print e converter) e/ou pdf-lib; suportar
     estilos coloquial/ABNT/formal.
     - Fase 3 — Mapa interativo: upload de imagem + pontos de interesse (lib react-zoom-pan-pinch + overlay com hotspots);
     board de quests; timeline de eventos.
     - Fase 4 — Mapa de ferimentos: SVG UV de corpo humano com regiões clicáveis; condições associadas a personagens.
     - Fase 5 — Revisão gramatical PT-BR: integração com LanguageTool (server local Docker) ou similar; opções
     coloquial/ABNT/formal; dicionário personalizado com treatAsProper/case sensitivity já no schema.
     - Fase 6 — Multi-usuário + DM/Player: ativar NextAuth.js (credenciais + opcional OAuth), convites por link/email,
     visibilidade de fichas (DM vê tudo, Player vê só as próprias e do jogo), realtime opcional via WebSocket.
     - Fase 7 — Desktop wrap: empacotar com Tauri (preferido sobre Electron pelo tamanho/perf), reaproveitando SQLite local.
     - Fase 8 — Mídia avançada: Asset real (upload, storage local ou S3-compatível), inserção de áudio/imagem inline no
     Tiptap, flags clicáveis em personagens/locais (já parcialmente atendido por GlossaryMention).