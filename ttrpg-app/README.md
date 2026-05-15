# TTRPG Scribbler

Compêndio de escrita para escritores de fantasia e mestres de RPG de mesa — inspirado em Novelcrafter e Scrivener, com foco em campanhas de TTRPG (PT-BR).

## Stack

- **Next.js 15** (App Router, RSC, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 3** + **ShadCN/UI** + **lucide-react** + **sonner** (toasts)
- **Tiptap 3** (StarterKit + Underline/Link/Placeholder/Typography/TaskList + Image + extensões custom `GlossaryMention` e `Audio`)
- **@dnd-kit** para drag-and-drop hierárquico
- **Prisma 6** + **SQLite** local (`prisma/dev.db`)
- **NextAuth 5** (Credentials + bcryptjs) — single-user no MVP
- **Zustand** para estado leve (workspace, save status, histórico)
- **Zod** para validação nas API routes
- **Puppeteer** para geração de PDF server-side
- **Vitest** para testes (com coverage v8)

## Como rodar (primeira vez)

```bash
npm install
npm run db:push     # cria as tabelas em prisma/dev.db
npm run db:seed     # popula com o projeto demo "A Queda de Valoran"
npm run dev         # abre em http://localhost:3000
```

Após editar `prisma/schema.prisma`, rode novamente `npm run db:push` (ou crie uma migração com `npx prisma migrate dev`). Para inspecionar dados visualmente: `npm run db:studio`.

Credenciais do usuário semeado: `owner@local.com` / `scribbler123`.

## Variáveis de ambiente

Arquivo `.env` na raiz:

```
DATABASE_URL=file:./dev.db
AUTH_SECRET=<um segredo aleatório de 32+ bytes>
NEXTAUTH_URL=http://localhost:3000

# Opcional — habilita a revisão avançada (LanguageTool).
# LANGUAGETOOL_URL=http://localhost:8010
```

`NEXTAUTH_URL` é usada também pelo gerador de PDF (puppeteer) como base URL ao
renderizar a página de impressão. Em deploy, ajuste para a URL pública.

## Estrutura

```
app/                                  Next.js App Router
  projects/                           Rotas por projeto (listagem, shell, write, world, glossary, …)
  api/                                Route handlers
    scenes/[sceneId]                  Autosave + revisões automáticas
    scenes/[sceneId]/revisions        GET/POST de versões da cena
    scenes/[sceneId]/revisions/.../restore   Restaurar revisão
    {acts,chapters,scenes}/reorder    Reordenação atômica (drag-and-drop)
    characters/.../conditions         Mapa de ferimentos (CharacterCondition)
    export/pdf                        Gera PDF via puppeteer
    grammar/check                     Proxy opcional para LanguageTool
    assets/[projectId]                Galeria de mídia
src/
  components/                         UI por domínio (shell, editor, projects, scenes, glossary, characters, world, ui, theme, common, auth, timeline, export, lore)
  lib/                                db.ts (Prisma), auth.ts (NextAuth), utils.ts, tiptap/, grammar/, export/, revisions.ts, bodyRegions.ts
  stores/workspace.ts                 Zustand: rightPanelOpen, saveStatus, lastSavedAt, currentSceneId, historyBump, …
  types/locationMap.ts                Zod schemas para markers de mapa com linkedEntity
prisma/
  schema.prisma                       Modelos: User, Project, Act, Chapter, Scene, SceneRevision, Character, CharacterCondition, Location, Item, GlossaryTerm, Tag, Lore, Asset, Event, …
  seed.ts                             Popula projeto demo
tests/                                Suites Vitest (api/, lib/, helpers/)
```

## Funcionalidades

### Núcleo
- Listagem de projetos com filtros (ativos / arquivados / lixeira) e criação.
- Shell por projeto: top tabs, sidebar esquerda dinâmica (personagens/locais/itens/lore), painel direito contextual, command palette (Cmd/Ctrl+K).
- Estrutura **Ato → Capítulo → Cena** com criação inline.
- **Drag-and-drop** hierárquico de Atos / Capítulos / Cenas (incluindo mover cena entre capítulos).
- Editor Tiptap rico com autosave (debounce 800ms) + indicador visual no top tab ("Salvando…/Salvo às HH:MM/Erro").
- **Histórico de cenas**: revisões automáticas (a cada 5 min ou 50 palavras diff, retenção 20 AUTO + todas MANUAL) + botão "Salvar versão" + restauração com snapshot prévio.
- Glossário com classe gramatical, gênero, conjugações, "tratar como nome próprio", "case sensitive".
- Mention inline no editor: digite `@` para inserir um termo do glossário (popover com regras).
- Personagens (PC/NPC/Vilão/Monstro) com biografia, atributos JSON livres e **mapa de ferimentos** (SVG body com regiões clicáveis, 4 severidades).
- Mundo: locais e itens com hierarquia. **Mapa interativo** por local com hotspots clicáveis que linkam a personagem/local/item.
- Lore: registros categorizados (religião, festival, cerimônia, cultura, história, outro).
- Linha do tempo de eventos.

### Editor e mídia
- Inserir imagens e áudio inline via botão na toolbar (galeria do projeto + upload novo).
- Limites: 5 MB para imagens (`png/jpg/webp`), 15 MB para áudio (`mp3/wav/ogg`).
- Áudio reproduz no editor; em PDF vira link textual "🎵 áudio: …" (puppeteer não embute som).

### Revisão de texto (PT-BR)
- **Regras locais** (instantâneas): espaço duplo, espaço antes de pontuação, palavra repetida, maiúscula após ponto, parágrafo longo, termos do glossário com case incorreto.
- **LanguageTool** (opcional): concordância, regência, conjugação, etc. via Docker local — ativado quando `LANGUAGETOOL_URL` está configurado. Chunking por parágrafo + cache em memória (TTL 30 min).
- Painel de revisão à direita identifica origem de cada issue (badge `Local` / `LT`).

### Exportação
- **PDF backend** (puppeteer): clique "Exportar PDF" na tela `/export`. Gera no servidor com layout fiel ao preview.
- 3 estilos tipográficos reais (não só CSS de tela): **ABNT** (Times 12pt, espaço 1.5, margens 3/2/2/3 cm, recuo 1.25 cm), **Formal** (Georgia 12pt, espaço 1.5, margens 2.5 cm), **Coloquial** (Inter 11pt, espaço 1.6, margens 2 cm).
- Granularidades: cena, capítulo, ato, projeto inteiro (com capa, sumário, glossário e lore).
- Fallback: botão "Pré-visualizar" abre o documento em outra aba e dispara o diálogo de impressão do navegador.

### Configurar LanguageTool (opcional)

Em outro terminal:

```bash
docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool
```

E adicione ao `.env`:

```
LANGUAGETOOL_URL=http://localhost:8010
```

Reinicie o `npm run dev`. Sem essa variável, a revisão usa apenas regras locais (degrada graciosamente — o painel de revisão continua funcionando).

## Testes

```bash
npm test                  # roda todas as suites (Vitest)
npm run test:watch        # modo watch
npm run test:coverage     # gera relatório em ./coverage (HTML em coverage/index.html)
```

Os thresholds atuais (em `vitest.config.ts`) cobrem `src/lib/**` e `app/api/**/route.ts` com 60% mínimo em lines/functions/statements e 50% em branches. Componentes de UI e stores ficam de fora do coverage por enquanto.

## Convenções

- Idioma da UI: **PT-BR**.
- Imports usam o alias `@/*` → `./src/*` (configurado em `tsconfig.json`).
- Componentes ShadCN ficam em `src/components/ui/` — modifique livremente, são parte do código do projeto.
- API routes validam o payload com Zod e checam ownership do projeto via `getCurrentUser()`.
- Feedback ao usuário usa `toast` do `sonner` (`import { toast } from "sonner"`). Evite `alert()`.
- Schema Prisma: rodar `npm run db:push` após qualquer alteração; `npm run db:reset` (com cuidado) faz reset + reseed.

## Fora do escopo (declarado)

- Multi-usuário DM/Player (`Member` existe no schema mas sem fluxo UI).
- Wrapper desktop (Tauri / Electron).
- Suporte específico a fichas D&D 5e / Tormenta20 (`System.rulesJson` segue NULL).
- Storage externo (S3 / R2). `public/uploads/` continua suficiente em single-user.
- Sincronização cloud / PWA offline.
- I18n para outros idiomas.
