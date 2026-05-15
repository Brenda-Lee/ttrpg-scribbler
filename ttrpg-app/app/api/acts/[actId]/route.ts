import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

async function loadOwned(actId: string) {
  const user = await getCurrentUser();
  return prisma.act.findFirst({
    where: { id: actId, project: { ownerId: user.id } },
    select: { id: true, projectId: true },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ actId: string }> }) {
  const { actId } = await ctx.params;
  const owned = await loadOwned(actId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  await prisma.act.update({ where: { id: actId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ actId: string }> }) {
  const { actId } = await ctx.params;
  const owned = await loadOwned(actId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.act.delete({ where: { id: actId } });
  return NextResponse.json({ ok: true });
}
