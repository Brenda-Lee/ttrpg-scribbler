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

  // Confirma ownership do projeto e que todos os atos pertencem a ele.
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ids = items.map((i) => i.id);
  const existing = await prisma.act.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true },
  });
  if (existing.length !== ids.length) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  await prisma.$transaction(
    items.map((it) =>
      prisma.act.update({
        where: { id: it.id },
        data: { order: it.order },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
