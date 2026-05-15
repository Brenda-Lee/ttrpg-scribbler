import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { maybeCreateAutoRevision } from "@/lib/revisions";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["DRAFT", "REVISING", "DONE"]).optional(),
  contentJson: z.unknown().optional(),
  contentText: z.string().optional(),
  wordCount: z.number().int().nonnegative().optional(),
});

async function loadOwnedScene(sceneId: string) {
  const user = await getCurrentUser();
  return prisma.scene.findFirst({
    where: { id: sceneId, chapter: { act: { project: { ownerId: user.id } } } },
    include: { chapter: { include: { act: true } } },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await ctx.params;
  const scene = await loadOwnedScene(sceneId);
  if (!scene) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.contentJson !== undefined)
    data.contentJson = JSON.stringify(parsed.data.contentJson);
  if (parsed.data.contentText !== undefined) data.contentText = parsed.data.contentText;
  if (parsed.data.wordCount !== undefined) data.wordCount = parsed.data.wordCount;

  await prisma.scene.update({ where: { id: sceneId }, data });

  // Revisão automática: somente quando o conteúdo da cena foi alterado.
  if (parsed.data.contentJson !== undefined) {
    await maybeCreateAutoRevision({
      sceneId,
      contentJson: data.contentJson as string,
      contentText: (data.contentText as string | undefined) ?? scene.contentText,
      wordCount: (data.wordCount as number | undefined) ?? scene.wordCount,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await ctx.params;
  const scene = await loadOwnedScene(sceneId);
  if (!scene) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.scene.delete({ where: { id: sceneId } });
  return NextResponse.json({ ok: true });
}
