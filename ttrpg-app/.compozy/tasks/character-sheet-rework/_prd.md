# PRD — Rework de Criação de Personagem com Ficha por Sistema

## Context

Hoje, criar um personagem no TTRPG Scribbler resume-se a preencher `name`, `role`, `bio` (Textarea livre) e `attributesJson` (Textarea monospace de JSON livre). Não há vínculo entre o `System` do projeto (D&D 5e ou Tormenta 20, já modelados em `prisma/schema.prisma:66-73`) e a estrutura de dados de jogo do personagem — `System.rulesJson` está vazio no seed (`prisma/seed.ts:44-51`) e a ficha do PDF oficial (em `sourceMaterial/D&D 5ed - Ficha Editável.pdf` e `sourceMaterial/T20 - Ficha Editável.pdf`) não tem reflexo na UI. O resultado é um app de escrita que ignora a dimensão "ficha de jogo" — central para escritores de RPG, que querem manter estatísticas, perícias e magias junto com a narrativa.

O `CharacterCondition` + `BodyMap` (`src/components/characters/BodyMap.tsx`) já implementa 12 regiões corporais com severidade, mas o visual é um SVG geométrico sem identidade — não comunica que aquele membro está afetado em termos de **jogo**, apenas registra uma anotação. A imagem `sourceMaterial/BodyMap.png` (silhueta vermelha anatômica frente+costas) é a referência visual a ser alcançada.

Este PRD descreve o rework: ao criar um personagem dentro de um projeto, automaticamente é instanciada uma **ficha estruturada** cujo schema vem do sistema escolhido; o BodyMap ganha visual anatômico e suas condições passam a aplicar modificadores nos valores derivados da ficha (ex.: ferimento severo em perna → Velocidade efetiva reduzida).

---

## Goals

1. Toda criação de Character no projeto gera automaticamente uma `CharacterSheet` correspondente ao `System` do projeto (ou à ficha "Genérica" se o projeto não tiver sistema).
2. A ficha é renderizada dinamicamente a partir de um schema declarado em `System.rulesJson`, com seções, campos tipados (number, text, textarea, select, repeating-list, derived) e validação.
3. Suportar duas fichas no MVP: **D&D 5e** e **Tormenta 20**, modeladas a partir dos PDFs oficiais; mais uma ficha **Genérica** mínima como fallback.
4. `Character.bio` é redefinido como "resumo" (rótulo na UI: "Resumo") — campo curto de assimilação rápida, mantido no Character (não na sheet).
5. `Character.attributesJson` permanece no Character como mapa livre de **links de mundo** (ex.: `{ patron: "locationId:xyz", signature_item: "itemId:abc" }`), separado da ficha de jogo.
6. BodyMap redesenhado visualmente no estilo do `BodyMap.png` (silhueta anatômica frente+costas, regiões coloridas por severidade).
7. Condições do BodyMap aplicam **modificadores** sobre campos derivados da ficha: o schema do sistema declara presets por (região, severidade); cada `CharacterCondition` pode adicionar/sobrescrever modificadores manualmente.
8. UI da ficha funciona para todos os roles (PC, NPC, VILLAIN, MONSTER) — mesma ficha, mesmo schema; o uso é decisão do escritor.

## Non-goals (fora deste PRD)

- Importar dados dos PDFs editáveis em runtime (parsing de AcroForm). Os PDFs são fonte de **modelagem** do schema, não de **dados** do usuário.
- Cálculo automático de regras complexas (ex.: D&D — calcular CA a partir de armadura equipada, slots de magia por classe/nível). Derivações limitam-se a fórmulas simples declaradas no schema (ex.: `mod = floor((score - 10) / 2)`).
- Exportar ficha como PDF preenchido. Vai para fase pós-MVP (já listada no CLAUDE.md como Fase 2).
- Multi-personagem em batch, importação de fichas externas, marketplace de fichas custom.
- Mudar regras/UI do `Project`/`System` (criação de novos sistemas pelo usuário fica fora).

---

## User flows

### F1. Criar personagem em projeto com sistema

1. Usuária está em `/projects/{id}/characters` (projeto demo seedado com `systemId: tormenta.id`).
2. Clica em "Novo personagem", preenche `name`, `role` e (opcionalmente) `summary`, clica "Criar".
3. Backend cria `Character` **e** `CharacterSheet` (com `systemSlug: "tormenta20"` e `dataJson` populado com defaults do schema).
4. Redireciona para `/projects/{id}/characters/{characterId}` com a ficha já carregada.

### F2. Editar ficha

1. Página de detalhe agora tem **3 abas** no painel principal: **Resumo** (atual), **Ficha** (nova), **Condições** (BodyMap redesenhado).
2. Aba "Ficha" renderiza seções (Identidade, Atributos, Perícias, Combate, etc.) a partir do schema do sistema. Cada campo tem autosave debouncing 800ms (mesmo padrão do TiptapEditor — ver `app/api/scenes/[sceneId]/route.ts`).
3. Campos derivados (modificadores, totais) se atualizam em tempo real no cliente; o servidor só recebe os campos **base**.
4. Indicador "Salvo/Salvando" reutiliza `useWorkspace.saveStatus` (`src/stores/workspace.ts`).

### F3. Aplicar ferimento → ver efeito na ficha

1. Usuária abre aba "Condições", clica em "Perna Esquerda" no novo SVG anatômico, cria condição com severity `SEVERE`.
2. Schema de T20 declara preset: `{ region: "LEFT_LEG", severity: "SEVERE", modifiers: [{ field: "deslocamento", delta: -3 }] }`.
3. Na aba "Ficha", campo `deslocamento` mostra: valor base `9` riscado, valor efetivo `6` com badge "−3 (perna esquerda severa)".
4. Usuária pode abrir a condição e adicionar/sobrescrever modificadores manualmente (ex.: também aplicar `-2 a perícias de DES`).

### F4. Projeto sem sistema escolhido

1. Projeto criado sem `systemId` → personagem criado nele recebe `CharacterSheet` com `systemSlug: "generic"`.
2. Ficha genérica tem apenas: Identidade (nome/raça/classe livre), 6 atributos numéricos rotuláveis, HP atual/máximo, Velocidade, Inventário (lista livre), Notas. Sem perícias, sem magias.

---

## Data model — mudanças em `prisma/schema.prisma`

### Novo modelo `CharacterSheet`

```prisma
model CharacterSheet {
  id          String   @id @default(cuid())
  characterId String   @unique
  systemSlug  String   // "dnd-5e" | "tormenta20" | "generic"
  schemaVersion Int    @default(1)
  dataJson    String   // JSON serializado dos valores base (campos NÃO derivados)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([systemSlug])
}
```

### Mudanças em `Character`

- Adicionar relação inversa: `sheet CharacterSheet?`
- Não renomear `bio` no schema (evita migration de dados); apenas mudar **rótulo na UI** para "Resumo". `attributesJson` permanece.

### Mudanças em `CharacterCondition`

- Adicionar campo: `modifiersJson String?` — JSON de overrides/extensões aplicados por essa condição (formato: `[{ field: string, delta: number, reason?: string }]`).
- Presets vêm do schema do sistema; `modifiersJson` permite o DM customizar caso a caso.

### Mudanças em `System.rulesJson`

Passa a ser populado no seed com o **schema da ficha** (estrutura abaixo). Permanece `String?` (nullable) — quando `null`, fallback para schema "generic".

---

## Schema da ficha (formato em `System.rulesJson`)

JSON com a estrutura abaixo. Versionado por `schemaVersion`. Renderizado por componente único `<SheetRenderer schema={...} value={...} onChange={...}/>`.

```jsonc
{
  "systemSlug": "tormenta20",
  "schemaVersion": 1,
  "sections": [
    {
      "id": "identity",
      "title": "Identidade",
      "fields": [
        { "id": "raca", "label": "Raça", "type": "text" },
        { "id": "origem", "label": "Origem", "type": "text" },
        { "id": "classe", "label": "Classe & Nível", "type": "text" },
        { "id": "divindade", "label": "Divindade", "type": "text" }
      ]
    },
    {
      "id": "attributes",
      "title": "Atributos",
      "fields": [
        { "id": "for", "label": "FOR", "type": "number", "default": 0 },
        { "id": "des", "label": "DES", "type": "number", "default": 0 },
        { "id": "con", "label": "CON", "type": "number", "default": 0 },
        { "id": "int", "label": "INT", "type": "number", "default": 0 },
        { "id": "sab", "label": "SAB", "type": "number", "default": 0 },
        { "id": "car", "label": "CAR", "type": "number", "default": 0 }
      ]
    },
    {
      "id": "combat",
      "title": "Combate",
      "fields": [
        { "id": "deslocamento", "label": "Deslocamento", "type": "number", "default": 9, "unit": "m" },
        { "id": "defesa_base", "label": "Defesa base", "type": "number", "default": 10 },
        {
          "id": "defesa_efetiva", "label": "Defesa efetiva", "type": "derived",
          "formula": "defesa_base + mod(des)"
        },
        { "id": "pv_atual", "label": "PV atual", "type": "number" },
        { "id": "pv_max", "label": "PV máximo", "type": "number" }
      ]
    },
    {
      "id": "skills",
      "title": "Perícias",
      "fields": [
        {
          "id": "pericias", "type": "repeating-list",
          "itemSchema": [
            { "id": "nome", "label": "Perícia", "type": "select", "options": ["Acrobacia", "Atletismo", "..."] },
            { "id": "ta", "label": "T.A.", "type": "number", "default": 0 },
            { "id": "atributo", "label": "Atributo", "type": "select", "options": ["FOR","DES","CON","INT","SAB","CAR"] }
          ]
        }
      ]
    },
    { "id": "equipment", "title": "Equipamento", "fields": [/* repeating-list de item/peso/custo */] },
    { "id": "spells", "title": "Magias", "fields": [/* repeating-list por círculo */] },
    { "id": "notes", "title": "Anotações", "fields": [{ "id": "anotacoes", "type": "textarea" }] }
  ],
  "injuryPresets": [
    { "region": "LEFT_LEG", "severity": "SEVERE", "modifiers": [{ "field": "deslocamento", "delta": -3, "reason": "Perna esquerda severamente ferida" }] },
    { "region": "LEFT_LEG", "severity": "CRITICAL", "modifiers": [{ "field": "deslocamento", "delta": -6 }] },
    { "region": "RIGHT_LEG", "severity": "SEVERE", "modifiers": [{ "field": "deslocamento", "delta": -3 }] },
    { "region": "HEAD", "severity": "SEVERE", "modifiers": [{ "field": "int", "delta": -2 }, { "field": "sab", "delta": -2 }] }
    // ... cobertura mínima: cada (região, severity in [SEVERE, CRITICAL])
  ]
}
```

Tipos de campo suportados: `text | textarea | number | checkbox | select | repeating-list | derived`. O renderer trata cada um. `derived` tem `formula` parseada com um avaliador seguro (sem `eval`) — referenciar campos por id; suportar `+ - * /`, `floor()`, `min()`, `max()` e `mod(attr) = floor((attr - 10) / 2)`. Modificadores de condições somam-se aos campos referenciados antes da derivação.

---

## UI

### Estrutura de arquivos novos

- `src/lib/sheets/types.ts` — tipos TS para `SheetSchema`, `SheetField`, `InjuryPreset`, `Modifier`.
- `src/lib/sheets/parser.ts` — valida `System.rulesJson` contra Zod e devolve `SheetSchema` tipado.
- `src/lib/sheets/formula.ts` — avaliador seguro de fórmulas dos campos `derived` (whitelist de operadores; sem `eval`/`Function`).
- `src/lib/sheets/applyModifiers.ts` — recebe `(baseValues, conditions, schema)` e devolve `effectiveValues` + lista de "porquês" por campo (para tooltip "−3 (perna esquerda severa)").
- `src/components/characters/sheet/SheetRenderer.tsx` — componente principal, renderiza seções via map.
- `src/components/characters/sheet/fields/` — um componente por `type` (`TextField`, `NumberField`, `SelectField`, `RepeatingListField`, `DerivedField`, `TextareaField`).
- `src/components/characters/sheet/SheetTabs.tsx` — abas Resumo / Ficha / Condições.
- `prisma/sheets/dnd5e.json` e `prisma/sheets/tormenta20.json` e `prisma/sheets/generic.json` — fontes carregadas pelo seed para popular `System.rulesJson`.

### Arquivos modificados

- `prisma/schema.prisma` — adicionar `CharacterSheet` e `CharacterCondition.modifiersJson` (ver acima).
- `prisma/seed.ts` — `System.rulesJson` populado a partir de `prisma/sheets/*.json`; para cada personagem do projeto demo, criar `CharacterSheet` correspondente com defaults aplicados.
- `app/api/characters/[projectId]/route.ts` (`POST`) — após criar o `Character`, criar `CharacterSheet` na mesma transação (`prisma.$transaction`), lendo `Project.system.rulesJson` para extrair defaults. Se `Project.systemId` for null, usar `systemSlug: "generic"`.
- `src/components/characters/CharacterDetailClient.tsx` — reorganizar em 3 abas (Resumo / Ficha / Condições) usando `<Tabs>` do ShadCN (já gerado).
- `src/components/characters/BodyMap.tsx` — redesign visual (ver próxima seção). Lógica de CRUD permanece; passa a aceitar `onConditionsChange` para o renderer da ficha recalcular `effectiveValues`.

### BodyMap — redesign visual

- Substituir o SVG atual (figuras geométricas) por uma **silhueta anatômica** frente+costas, no estilo da `BodyMap.png` (silhueta vermelha sobre fundo escuro). Pode ser feito como dois SVGs lado a lado (frente | costas), cada um com `<path>` por região clicável. Estilo: contorno + fill semitransparente que escurece/colore conforme severidade. Hover destaca a região.
- Manter as 12 regiões e o enum `BODY_REGIONS` — sem migration de dados.
- Mostrar contagem total de modificadores ativos por região (ex.: badge "2" se duas condições afetam aquela perna).
- Painel lateral lista condições agrupadas por região, com preview dos modificadores aplicados (vindos do preset do sistema + `modifiersJson` override). Permite editar `modifiersJson` em modal (form simples: lista de `{field, delta, reason}`).

### Form da ficha — autosave

- Reutilizar padrão de debounce 800ms do editor de cenas (ver `src/components/editor/TiptapEditor.tsx`). Hook novo: `src/hooks/useDebouncedAutosave.ts` (extrair lógica se ainda inline na cena).
- Endpoint `PATCH /api/characters/[projectId]/[characterId]/sheet` recebe `{ dataJson }` parcial e faz `prisma.characterSheet.update({ where: { characterId }, data: { dataJson: merged } })`. Validação Zod com `z.record(z.unknown())` (schema dinâmico — confiar no client com sanitização básica).
- Indicador de salvamento usa `useWorkspace.setSaveStatus`.

---

## API — endpoints novos/alterados

| Método | Rota | Mudança | Body Zod |
|---|---|---|---|
| `POST` | `/api/characters/[projectId]` | Criar Character **e** CharacterSheet (transação). Schema: `defaults` derivados de `System.rulesJson` ou fallback `generic`. | Já existe (`PostSchema` em `app/api/characters/[projectId]/route.ts:6-11`) — sem mudança de input. |
| `GET` | `/api/characters/[projectId]/[characterId]/sheet` | Novo. Retorna `{ sheet, schema, effectiveValues, modifierBreakdown }` (já com merge de presets + overrides + derivações). | — |
| `PATCH` | `/api/characters/[projectId]/[characterId]/sheet` | Novo. Aceita patch parcial sobre `dataJson`. | `z.object({ patch: z.record(z.unknown()) })` |
| `PATCH` | `/api/characters/[projectId]/[characterId]/conditions/[conditionId]` | Adicionar suporte a `modifiersJson` no schema Zod. | Estender com `modifiersJson: z.array(z.object({ field: z.string(), delta: z.number(), reason: z.string().optional() })).optional()`. |

---

## Migrations & backfill

1. Adicionar `CharacterSheet` e `CharacterCondition.modifiersJson` em `schema.prisma`.
2. Rodar `prisma db push` (SQLite dev — não precisa de migration file no MVP, conforme padrão atual do projeto: `package.json` tem `db:push` mas não `migrate dev`).
3. Atualizar `prisma/seed.ts`:
   - Carregar `prisma/sheets/dnd5e.json`, `tormenta20.json`, `generic.json` (criados a partir da análise dos PDFs em `sourceMaterial/`).
   - Popular `System.rulesJson` para os dois systems existentes.
   - Para cada personagem do projeto demo, criar `CharacterSheet` com defaults aplicados.
4. Script `npm run db:reseed` (já existe via `db:seed` + `db:push --force-reset`?) — verificar e ajustar README.
5. **Personagens já existentes em DBs de dev** (caso a usuária tenha): script idempotente no `seed.ts` que, para cada Character sem sheet, cria uma CharacterSheet com defaults do sistema do projeto (ou `generic`).

---

## Critical files (referência rápida)

Arquivos que serão **modificados**:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `app/api/characters/[projectId]/route.ts:6-11` (POST — adicionar criação de CharacterSheet)
- `app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route.ts:12-18` (PATCH — adicionar `modifiersJson`)
- `src/components/characters/CharacterDetailClient.tsx` (introduzir abas)
- `src/components/characters/BodyMap.tsx` (redesign visual + emitir mudanças de condição)

Arquivos **criados**:
- `prisma/sheets/dnd5e.json`, `tormenta20.json`, `generic.json`
- `src/lib/sheets/{types,parser,formula,applyModifiers}.ts`
- `src/components/characters/sheet/SheetRenderer.tsx` + `sheet/fields/*` + `sheet/SheetTabs.tsx`
- `src/hooks/useDebouncedAutosave.ts` (se ainda não extraído)
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (GET/PATCH)

Reuso de utilitários existentes:
- `src/lib/db.ts` (Prisma singleton)
- `src/stores/workspace.ts` `saveStatus`/`setSaveStatus`/`setLastSavedAt` para indicador de salvamento.
- Primitives ShadCN já gerados: `Tabs`, `Input`, `Select`, `Textarea`, `Dialog`, `Tooltip`, `Badge`, `Card`, `ScrollArea`.

---

## Verificação end-to-end (manual, ao concluir)

1. `npm install && npm run db:push && npm run db:seed && npm run dev`.
2. Abrir um personagem do projeto demo: verificar 3 abas (Resumo / Ficha / Condições).
3. Aba "Ficha" do personagem com `system = tormenta20`: renderiza seções Identidade, Atributos, Combate, Perícias, Equipamento, Magias, Anotações. Editar campo `deslocamento`; ver indicador "Salvando → Salvo"; recarregar a página → valor persiste.
4. Criar campo derivado: digitar `des = 14`; verificar `defesa_efetiva = 12` (10 + mod(14) = 10 + 2).
5. Em "Condições", aplicar `SEVERE` em `LEFT_LEG`; voltar a "Ficha"; ver `deslocamento` riscado (`9`) e efetivo (`6`) com tooltip de razão.
6. Adicionar override em `modifiersJson` da condição: `{ field: "des", delta: -1, reason: "Mancando" }`; ver `des` efetivo cair e `defesa_efetiva` recalcular.
7. Criar projeto sem sistema (`POST /api/projects` com `systemId: null` ou via UI); criar personagem; verificar que a ficha "Genérica" carrega.
8. Criar personagem em projeto `D&D 5e`: verificar que renderiza seções D&D 5e (CA, Proficiência, Salvaguardas) — não as de T20.
9. `npm run lint && npm run build` sem erros.

---

## Fases futuras (não implementadas agora)

- **Editor de schema de ficha** — UI para o DM customizar `System.rulesJson` de seus próprios sistemas sem editar arquivos.
- **Export PDF preenchido** — overlay no `D&D 5ed - Ficha Editável.pdf` / `T20 - Ficha Editável.pdf` usando `pdf-lib` para colar valores nos AcroFields.
- **Cálculos avançados** — slots de magia por nível/classe, ataques com bônus de proficiência automáticos, encumbrance.
- **Histórico/versionamento de ficha** — snapshots por sessão de jogo.
- **Compartilhamento DM↔Player** — visibilidade granular por campo da ficha (ex.: PV escondido do jogador).
