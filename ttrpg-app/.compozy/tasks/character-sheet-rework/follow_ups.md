# Character Sheet Rework — Follow-ups adiados

Estes itens vieram do code review feito após a conclusão das tasks 1–17.
Foram avaliados como não-bloqueantes para o MVP single-user local; cada um
fica documentado aqui para revisão em uma fase posterior do produto.

## Adiados

### 1. Tipagem do `useForm` em `SheetRenderer`
- **Estado atual**: `useForm<any>` + `zodResolver(resolverSchema as any)` em
  [src/components/characters/sheet/SheetRenderer.tsx:200-205](../../../src/components/characters/sheet/SheetRenderer.tsx#L200-L205).
- **Por quê**: a inferência recursiva de `FieldValue` em `SheetFormValues`
  estoura `tsc` com `TS2589`. O cast é contido e a borda recupera o tipo
  via `Control<SheetFormValues>`.
- **Quando revisitar**: quando o renderer ganhar mais customização de schema
  (autosave parcial por campo, validação por campo, etc.) — vale fechar a
  brecha de tipos antes de adicionar mais lógica genérica.
- **Caminho provável**: substituir `FieldValue` recursivo por uma união plana
  (`string | number | boolean | FieldValue[]`) e gerar tipos por schema via
  Zod inference.

### 2. `topLevelDiff` usa `JSON.stringify` por chave
- **Estado atual**:
  [src/components/characters/sheet/SheetRenderer.tsx:48-58](../../../src/components/characters/sheet/SheetRenderer.tsx#L48-L58).
- **Por quê**: para os catálogos atuais (≤30 chaves top-level) o custo de
  serializar a cada tick é trivial.
- **Quando revisitar**: se introduzirmos schemas grandes (D&D 5e completo com
  feitiços por nível, listas longas de `attacks`) ou observarmos jank no
  profiler durante a digitação.
- **Caminho provável**: comparar por referência usando o `dirtyFields` do RHF
  (com `useFormState({ control })` e `dirtyFields[key] === true`), enviando
  apenas o subconjunto sujo.

### 3. `BodyMap` faz fetch + emit no carregamento inicial
- **Estado atual**:
  [src/components/characters/BodyMap.tsx:94-110](../../../src/components/characters/BodyMap.tsx#L94-L110).
  O servidor já trouxe as condições; ao montar Condições, o BodyMap refaz
  o GET e dispara `onConditionsChange` com o resultado.
- **Por quê**: no MVP single-user local o custo é uma round-trip extra; a
  refetch é, paradoxalmente, mais consistente em cenários multi-aba.
- **Quando revisitar**: ao adicionar fluxo multi-usuário / colaborativo, ou
  se o ambiente passar a ter latência relevante.
- **Caminho provável**: aceitar `initialConditions` como prop, pular o GET
  inicial e só recarregar após CRUD. Implica atualizar testes que dependem
  do GET na montagem.

### 4. `applyModifiers` não deduplica por `condition.id`
- **Estado atual**: itera condições sem checar duplicatas.
- **Por quê**: IDs são cuid; duplicatas hoje são impossíveis na origem.
- **Quando revisitar**: quando adicionarmos import/export de fichas, save
  manual de snapshots, ou ingestão de eventos externos — fronteiras onde
  IDs duplicados poderiam vazar.
- **Caminho provável**: deduplicar por `id` em `applyModifiers` antes do
  sort por id, ou validar via Zod na fronteira (parseSheet/parseConditions).

### 5. Teste de rollback do POST `/api/characters`
- **Estado atual**:
  [tests/api/characters-post.test.ts](../../../tests/api/characters-post.test.ts)
  injeta um `Proxy` sobre `prisma.$transaction` para forçar falha no
  `tx.characterSheet.create`.
- **Por quê**: funciona, mas é frágil a mudanças internas do Prisma 6+.
- **Quando revisitar**: ao bump major do Prisma ou ao migrar para
  Postgres/Supabase — provavelmente vamos preferir uma constraint real
  (ex.: NOT NULL em `dataJson`) que cause a falha naturalmente.
