import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Restaura uma revisão para a cena: cria uma nova revisão MANUAL
 * com o conteúdo ATUAL (snapshot pré-restauração, rotulada "Antes de restaurar")
 * e atualiza o `Scene.contentJson` para o conteúdo da revisão alvo.
 *
 * Tudo em transação.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ sceneId: string; revisionId: string }> },
) {
  const { sceneId, revisionId } = await ctx.params;
  const user = await getCurrentUser();

  const target = await prisma.sceneRevision.findFirst({
    where: {
      id: revisionId,
      sceneId,
      scene: { chapter: { act: { project: { ownerId: user.id } } } },
    },
    include: { scene: true },
  });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stamp = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  await prisma.$transaction([
    prisma.sceneRevision.create({
      data: {
        sceneId,
        contentJson: target.scene.contentJson,
        contentText: target.scene.contentText,
        wordCount: target.scene.wordCount,
        kind: "MANUAL",
        label: `Antes de restaurar (${stamp})`,
      },
    }),
    prisma.scene.update({
      where: { id: sceneId },
      data: {
        contentJson: target.contentJson,
        contentText: target.contentText,
        wordCount: target.wordCount,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
