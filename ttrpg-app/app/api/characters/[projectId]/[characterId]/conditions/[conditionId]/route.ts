import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  BODY_REGIONS,
  CONDITION_SEVERITIES,
  type BodyRegion,
  type ConditionSeverity,
} from "@/lib/bodyRegions";

const ModifierSchema = z
  .object({
    field: z.string().min(1),
    delta: z.number(),
    reason: z.string().max(200).optional(),
  })
  .strict();

const PatchSchema = z.object({
  region: z.enum([...BODY_REGIONS] as [BodyRegion, ...BodyRegion[]]).optional(),
  severity: z
    .enum([...CONDITION_SEVERITIES] as [ConditionSeverity, ...ConditionSeverity[]])
    .optional(),
  description: z.string().max(1000).nullable().optional(),
  modifiersJson: z.array(ModifierSchema).nullable().optional(),
});

async function loadOwned(projectId: string, characterId: string, conditionId: string) {
  const user = await getCurrentUser();
  return prisma.characterCondition.findFirst({
    where: {
      id: conditionId,
      characterId,
      character: { projectId, project: { ownerId: user.id } },
    },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string; conditionId: string }> },
) {
  const { projectId, characterId, conditionId } = await ctx.params;
  const owned = await loadOwned(projectId, characterId, conditionId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.region !== undefined) data.region = parsed.data.region;
  if (parsed.data.severity !== undefined) data.severity = parsed.data.severity;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.modifiersJson !== undefined) {
    data.modifiersJson =
      parsed.data.modifiersJson === null
        ? null
        : JSON.stringify(parsed.data.modifiersJson);
  }

  await prisma.characterCondition.update({ where: { id: conditionId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string; conditionId: string }> },
) {
  const { projectId, characterId, conditionId } = await ctx.params;
  const owned = await loadOwned(projectId, characterId, conditionId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.characterCondition.delete({ where: { id: conditionId } });
  return NextResponse.json({ ok: true });
}
