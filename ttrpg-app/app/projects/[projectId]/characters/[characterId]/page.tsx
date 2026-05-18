import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadSheetSchema } from "@/lib/sheets/loadSchema";
import { derive } from "@/lib/sheets/derive";
import { extractDefaults } from "@/lib/sheets/defaults";
import type {
  BreakdownEntry,
  FieldValue,
  SheetFormValues,
  SheetSchema,
} from "@/lib/sheets/types";
import type { ConditionInput } from "@/lib/sheets/applyModifiers";
import { CharacterDetailClient } from "@/components/characters/CharacterDetailClient";

export const dynamic = "force-dynamic";

function parseBase(dataJson: string | null | undefined): SheetFormValues {
  if (!dataJson) return {};
  try {
    const parsed = JSON.parse(dataJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SheetFormValues;
    }
  } catch {
    // fall through to {}
  }
  return {};
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; characterId: string }>;
}) {
  const { projectId, characterId } = await params;
  const user = await getCurrentUser();
  const character = await prisma.character.findFirst({
    where: { id: characterId, projectId, project: { ownerId: user.id } },
    include: {
      sheet: true,
      project: { select: { system: { select: { slug: true } } } },
    },
  });
  if (!character) notFound();

  const schema: SheetSchema = await loadSheetSchema(
    character.project.system?.slug ?? null,
  );

  // Backfill: ADR-001 estabelece que toda Character tem um CharacterSheet
  // (1:1). Para personagens legados criados antes da task 09 (ou via outras
  // rotinas que não passam pelo POST), o sheet pode faltar — sem ele, o
  // PATCH /sheet 404a no salvamento. O upsert aqui é idempotente e seguro
  // contra corrida (a constraint @unique em characterId garante).
  const defaults = extractDefaults(schema);
  const sheetRow = character.sheet
    ? character.sheet
    : await prisma.characterSheet.upsert({
        where: { characterId: character.id },
        create: {
          characterId: character.id,
          systemSlug: schema.systemSlug,
          schemaVersion: schema.schemaVersion,
          dataJson: JSON.stringify(defaults),
        },
        update: {},
      });

  // `dataJson` pode ter ficado desatualizado quando o schemaVersion subiu;
  // mesclar com os defaults garante que campos novos apareçam preenchidos.
  const base: SheetFormValues = { ...defaults, ...parseBase(sheetRow.dataJson) };

  const conditionRows = await prisma.characterCondition.findMany({
    where: { characterId },
    orderBy: { createdAt: "asc" },
  });
  const conditions: ConditionInput[] = conditionRows.map((row) => ({
    id: row.id,
    region: row.region,
    severity: row.severity,
    modifiersJson: row.modifiersJson,
  }));

  const { effective, breakdown } = derive(base, conditions, schema);

  return (
    <CharacterDetailClient
      projectId={projectId}
      character={{
        id: character.id,
        name: character.name,
        role: character.role,
        bio: character.bio,
        attributesJson: character.attributesJson,
      }}
      sheet={{
        schema,
        base,
        effective: effective as Record<string, FieldValue>,
        breakdown: breakdown as Record<string, BreakdownEntry[]>,
        conditions,
      }}
    />
  );
}
