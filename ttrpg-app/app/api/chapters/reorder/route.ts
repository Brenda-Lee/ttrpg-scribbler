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
      actId: z.string().min(1).optional(),
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

  // Ownership do projeto
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ids = items.map((i) => i.id);
  const actIds = Array.from(
    new Set(items.map((i) => i.actId).filter((v): v is string => Boolean(v))),
  );

  // Todos os capítulos pertencem a algum ato do projeto
  const existingChapters = await prisma.chapter.findMany({
    where: { id: { in: ids }, act: { projectId } },
    select: { id: true },
  });
  if (existingChapters.length !== ids.length) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  // Todos os atos alvo (quando há reparent) pertencem ao projeto
  if (actIds.length > 0) {
    const existingActs = await prisma.act.findMany({
      where: { id: { in: actIds }, projectId },
      select: { id: true },
    });
    if (existingActs.length !== actIds.length) {
      return NextResponse.json({ error: "invalid_parent" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.chapter.update({
        where: { id: it.id },
        data: {
          order: it.order,
          ...(it.actId ? { actId: it.actId } : {}),
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
