import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const Schema = z.object({
  projectId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().nonnegative(),
      chapterId: z.string().min(1).optional(),
    }),
  ),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { projectId, items } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ids = items.map((i) => i.id);
  const chapterIds = Array.from(
    new Set(items.map((i) => i.chapterId).filter((v): v is string => Boolean(v))),
  );

  // Todas as cenas pertencem a algum capítulo de algum ato do projeto
  const existingScenes = await prisma.scene.findMany({
    where: { id: { in: ids }, chapter: { act: { projectId } } },
    select: { id: true },
  });
  if (existingScenes.length !== ids.length) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  if (chapterIds.length > 0) {
    const existingChapters = await prisma.chapter.findMany({
      where: { id: { in: chapterIds }, act: { projectId } },
      select: { id: true },
    });
    if (existingChapters.length !== chapterIds.length) {
      return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.scene.update({
        where: { id: it.id },
        data: {
          order: it.order,
          ...(it.chapterId ? { chapterId: it.chapterId } : {}),
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
