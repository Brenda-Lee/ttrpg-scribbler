import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadSheetSchema } from "@/lib/sheets/loadSchema";
import { derive } from "@/lib/sheets/derive";
import { extractDefaults } from "@/lib/sheets/defaults";
import { buildPatchSchema } from "@/lib/sheets/zodFromSchema";
import type { ConditionInput } from "@/lib/sheets/applyModifiers";
import type { FieldValue } from "@/lib/sheets/types";

const PatchBodySchema = z.object({
  patch: z.record(z.string(), z.unknown()),
});

async function loadOwnedCharacterWithSheet(
  projectId: string,
  characterId: string,
) {
  const user = await getCurrentUser();
  return prisma.character.findFirst({
    where: {
      id: characterId,
      projectId,
      project: { ownerId: user.id },
    },
    include: {
      sheet: true,
      project: { select: { system: { select: { slug: true } } } },
    },
  });
}

function parseBase(dataJson: string): Record<string, FieldValue> {
  try {
    const parsed = JSON.parse(dataJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, FieldValue>;
    }
  } catch {
    // Ignore: fall through to empty base.
  }
  return {};
}

function toConditionInputs(
  rows: { id: string; region: string; severity: string; modifiersJson: string | null }[],
): ConditionInput[] {
  return rows.map((row) => ({
    id: row.id,
    region: row.region,
    severity: row.severity,
    modifiersJson: row.modifiersJson,
  }));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const character = await loadOwnedCharacterWithSheet(projectId, characterId);
  if (!character || !character.sheet) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const schema = await loadSheetSchema(character.project.system?.slug ?? null);
  const base = parseBase(character.sheet.dataJson);
  const conditionRows = await prisma.characterCondition.findMany({
    where: { characterId },
    orderBy: { createdAt: "asc" },
  });
  const { effective, breakdown } = derive(
    base,
    toConditionInputs(conditionRows),
    schema,
  );

  return NextResponse.json({
    schema,
    base,
    effective,
    breakdown,
    conditions: conditionRows,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const character = await loadOwnedCharacterWithSheet(projectId, characterId);
  // 404 só quando o personagem em si não existe / não é do dono. Sheet
  // ausente é tolerado: vamos criá-lo no upsert abaixo. ADR-001 promete
  // 1:1 mas personagens legados anteriores à task 09 podem ter quebrado
  // o invariante — o PATCH precisa ser auto-curativo.
  if (!character) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const envelope = PatchBodySchema.safeParse(body);
  if (!envelope.success) {
    return NextResponse.json(
      { error: "invalid", issues: envelope.error.issues },
      { status: 400 },
    );
  }

  const schema = await loadSheetSchema(character.project.system?.slug ?? null);
  const patchValidator = buildPatchSchema(schema);
  const parsedPatch = patchValidator.safeParse(envelope.data.patch);
  if (!parsedPatch.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsedPatch.error.issues },
      { status: 400 },
    );
  }

  const baseFromSheet = character.sheet ? parseBase(character.sheet.dataJson) : null;
  const base = baseFromSheet ?? extractDefaults(schema);
  const merged: Record<string, FieldValue> = { ...base };
  for (const [key, value] of Object.entries(parsedPatch.data ?? {})) {
    if (value === undefined) continue;
    merged[key] = value as FieldValue;
  }

  await prisma.characterSheet.upsert({
    where: { characterId },
    create: {
      characterId,
      systemSlug: schema.systemSlug,
      schemaVersion: schema.schemaVersion,
      dataJson: JSON.stringify(merged),
    },
    update: { dataJson: JSON.stringify(merged) },
  });

  const conditionRows = await prisma.characterCondition.findMany({
    where: { characterId },
    orderBy: { createdAt: "asc" },
  });
  const { effective, breakdown } = derive(
    merged,
    toConditionInputs(conditionRows),
    schema,
  );

  return NextResponse.json({ base: merged, effective, breakdown });
}
