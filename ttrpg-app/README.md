# TTRPG Scribbler

Compêndio de escrita para escritores de fantasia e mestres de RPG de mesa — inspirado em Novelcrafter e Scrivener, com foco em campanhas de TTRPG (PT-BR).

## Stack

- **Next.js 15** (App Router, RSC, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 3** + **ShadCN/UI** + **lucide-react**
- **Tiptap 3** (StarterKit + Underline/Link/Placeholder/Typography/TaskList + extensão custom `GlossaryMention`)
- **Prisma 6** + **SQLite** local (`prisma/dev.db`)
- **Zustand** para estado leve (workspace, save status)
- **Zod** para validação nas API routes

## Como rodar (primeira vez)

```bash
npm install
npm run db:push     # cria as tabelas em prisma/dev.db
npm run db:seed     # popula com o projeto demo "A Queda de Valoran"
npm run dev         # abre em http://localhost:3000
```

Após editar `prisma/schema.prisma`, rode novamente `npm run db:push` (ou crie uma migração com `npx prisma migrate dev`). Para inspecionar dados visualmente: `npm run db:studio`.

## Estrutura

```
app/                 Next.js App Router
  projects/          Rotas de projetos (listagem, novo, shell por projeto)
  api/               API routes (scenes, glossary, characters, world)
src/
  components/        UI por domínio (shell, editor, projects, scenes, glossary, characters, world, ui)
  lib/               db.ts (Prisma singleton), auth.ts (MVP single-user), utils.ts, tiptap/
  stores/            workspace.ts (Zustand)
prisma/
  schema.prisma      modelo de dados
  seed.ts            popula projeto demo
```

## MVP atual

- Listagem de projetos + criação.
- Shell por projeto: top tabs + sidebar esquerda de entidades + painel direito.
- Estrutura Ato → Capítulo → Cena com criação inline.
- Editor Tiptap rico com autosave (debounce 800ms) e toolbar.
- Glossário com classe gramatical, gênero, "tratar como nome próprio", "case sensitive".
- Mention inline no editor: digite `@` para inserir um termo do glossário.
- Personagens (PC/NPC/Vilão/Monstro) com biografia e atributos JSON livres.
- Mundo: locais e itens.

## Não implementado (fases pós-MVP — ver plano)

Exportação PDF, mapa interativo, mapa de ferimentos, timeline de eventos, revisão gramatical PT-BR, autenticação multiusuário/DM↔Player, upload de mídia avançada, wrapper desktop (Tauri).

## Convenções

- Idioma da UI: **PT-BR**.
- Imports usam o alias `@/*` → `./src/*` (configurado em `tsconfig.json`).
- Componentes ShadCN ficam em `src/components/ui/` — modifique livremente, são parte do código do projeto.
- API routes validam o payload com Zod e checam ownership do projeto via `getCurrentUser()`.
