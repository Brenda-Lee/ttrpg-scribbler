import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PostSchema = z.object({
  label: z.string().min(1).max(120).optional(),
});

async function loadOwnedScene(sceneId: string) {
  const user = await getCurrentUser();
  return prisma.scene.findFirst({
    where: { id: sceneId, chapter: { act: { project: { ownerId: user.id } } } },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await ctx.params;
  const scene = await loadOwnedScene(sceneId);
  if (!scene) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const revisions = await prisma.sceneRevision.findMany({
    where: { sceneId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      label: true,
      wordCount: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ revisions });
}

export async function POST(req: Request, ctx: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await ctx.params;
  const scene = await loadOwnedScene(sceneId);
  if (!scene) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const created = await prisma.sceneRevision.create({
    data: {
      sceneId,
      contentJson: scene.contentJson,
      contentText: scene.contentText,
      wordCount: scene.wordCount,
      kind: "MANUAL",
      label: parsed.data.label ?? null,
    },
    select: { id: true, kind: true, label: true, wordCount: true, createdAt: true },
  });

  return NextResponse.json({ revision: created }, { status: 201 });
}
