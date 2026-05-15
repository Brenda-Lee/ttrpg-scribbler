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

const PostSchema = z.object({
  region: z.enum([...BODY_REGIONS] as [BodyRegion, ...BodyRegion[]]),
  severity: z
    .enum([...CONDITION_SEVERITIES] as [ConditionSeverity, ...ConditionSeverity[]])
    .optional(),
  description: z.string().max(1000).optional(),
});

async function loadOwnedCharacter(projectId: string, characterId: string) {
  const user = await getCurrentUser();
  return prisma.character.findFirst({
    where: {
      id: characterId,
      projectId,
      project: { ownerId: user.id },
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const character = await loadOwnedCharacter(projectId, characterId);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const conditions = await prisma.characterCondition.findMany({
    where: { characterId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ conditions });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const character = await loadOwnedCharacter(projectId, characterId);
  if (!character) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const created = await prisma.characterCondition.create({
    data: {
      characterId,
      region: parsed.data.region,
      severity: parsed.data.severity ?? "LIGHT",
      description: parsed.data.description ?? null,
    },
  });
  return NextResponse.json({ condition: created }, { status: 201 });
}
