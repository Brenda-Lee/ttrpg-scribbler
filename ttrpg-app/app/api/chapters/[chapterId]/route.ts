import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().nullable().optional(),
  characterIds: z.array(z.string()).optional(),
  tagNames: z.array(z.string().min(1).max(60)).optional(),
});

async function loadOwned(chapterId: string) {
  const user = await getCurrentUser();
  return prisma.chapter.findFirst({
    where: { id: chapterId, act: { project: { ownerId: user.id } } },
    include: { act: { select: { projectId: true } } },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const owned = await loadOwned(chapterId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const projectId = owned.act.projectId;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  // Atualizações simples
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.summary !== undefined) data.summary = parsed.data.summary;
  if (Object.keys(data).length > 0) {
    await prisma.chapter.update({ where: { id: chapterId }, data });
  }

  // Re-sync de personagens
  if (parsed.data.characterIds !== undefined) {
    const valid = await prisma.character.findMany({
      where: { id: { in: parsed.data.characterIds }, projectId },
      select: { id: true },
    });
    const validIds = new Set(valid.map((c) => c.id));
    await prisma.chapterCharacter.deleteMany({ where: { chapterId } });
    if (validIds.size > 0) {
      await prisma.chapterCharacter.createMany({
        data: Array.from(validIds).map((characterId) => ({ chapterId, characterId })),
      });
    }
  }

  // Re-sync de tags (cria as inexistentes pelo nome)
  if (parsed.data.tagNames !== undefined) {
    const names = Array.from(
      new Set(parsed.data.tagNames.map((n) => n.trim()).filter((n) => n.length > 0)),
    );
    // Upsert das tags por (projectId, name)
    const existing = await prisma.tag.findMany({
      where: { projectId, name: { in: names } },
      select: { id: true, name: true },
    });
    const existingByName = new Map(existing.map((t) => [t.name, t.id]));
    const missing = names.filter((n) => !existingByName.has(n));
    if (missing.length > 0) {
      await prisma.tag.createMany({
        data: missing.map((name) => ({ projectId, name })),
      });
      const reloaded = await prisma.tag.findMany({
        where: { projectId, name: { in: missing } },
        select: { id: true, name: true },
      });
      for (const t of reloaded) existingByName.set(t.name, t.id);
    }
    await prisma.chapterTag.deleteMany({ where: { chapterId } });
    if (names.length > 0) {
      await prisma.chapterTag.createMany({
        data: names.map((name) => ({ chapterId, tagId: existingByName.get(name)! })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const owned = await loadOwned(chapterId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.chapter.delete({ where: { id: chapterId } });
  return NextResponse.json({ ok: true });
}
