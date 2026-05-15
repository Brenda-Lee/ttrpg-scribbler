import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const LORE_CATEGORIES = [
  "RELIGION",
  "FESTIVAL",
  "CEREMONY",
  "CULTURE",
  "HISTORY",
  "OTHER",
] as const;

const PatchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  category: z.enum(LORE_CATEGORIES).optional(),
  excerpt: z.string().nullable().optional(),
  body: z.string().optional(),
  metaJson: z.unknown().optional(),
});

async function loadOwned(projectId: string, loreId: string) {
  const user = await getCurrentUser();
  return prisma.lore.findFirst({
    where: { id: loreId, projectId, project: { ownerId: user.id } },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; loreId: string }> },
) {
  const { projectId, loreId } = await ctx.params;
  const existing = await loadOwned(projectId, loreId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.excerpt !== undefined) data.excerpt = parsed.data.excerpt;
  if (parsed.data.body !== undefined) data.body = parsed.data.body;
  if (parsed.data.metaJson !== undefined)
    data.metaJson =
      parsed.data.metaJson === null ? null : JSON.stringify(parsed.data.metaJson);

  await prisma.lore.update({ where: { id: loreId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; loreId: string }> },
) {
  const { projectId, loreId } = await ctx.params;
  const existing = await loadOwned(projectId, loreId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.lore.delete({ where: { id: loreId } });
  return NextResponse.json({ ok: true });
}
