import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["PC", "NPC", "VILLAIN", "MONSTER"]).optional(),
  bio: z.string().nullable().optional(),
  attributesJson: z.unknown().optional(),
});

async function loadOwned(projectId: string, characterId: string) {
  const user = await getCurrentUser();
  return prisma.character.findFirst({
    where: { id: characterId, projectId, project: { ownerId: user.id } },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const existing = await loadOwned(projectId, characterId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  if (parsed.data.attributesJson !== undefined)
    data.attributesJson = JSON.stringify(parsed.data.attributesJson);
  await prisma.character.update({ where: { id: characterId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; characterId: string }> },
) {
  const { projectId, characterId } = await ctx.params;
  const existing = await loadOwned(projectId, characterId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.character.delete({ where: { id: characterId } });
  return NextResponse.json({ ok: true });
}
