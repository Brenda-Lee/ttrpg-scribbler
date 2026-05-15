import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function loadOwned(sceneId: string, revisionId: string) {
  const user = await getCurrentUser();
  return prisma.sceneRevision.findFirst({
    where: {
      id: revisionId,
      sceneId,
      scene: { chapter: { act: { project: { ownerId: user.id } } } },
    },
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sceneId: string; revisionId: string }> },
) {
  const { sceneId, revisionId } = await ctx.params;
  const revision = await loadOwned(sceneId, revisionId);
  if (!revision) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ revision });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ sceneId: string; revisionId: string }> },
) {
  const { sceneId, revisionId } = await ctx.params;
  const revision = await loadOwned(sceneId, revisionId);
  if (!revision) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.sceneRevision.delete({ where: { id: revisionId } });
  return NextResponse.json({ ok: true });
}
