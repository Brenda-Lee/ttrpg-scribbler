import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().nullable().optional(),
  systemId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

async function loadOwned(projectId: string) {
  const user = await getCurrentUser();
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await loadOwned(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.summary !== undefined) data.summary = parsed.data.summary;
  if (parsed.data.systemId !== undefined) data.systemId = parsed.data.systemId;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  await prisma.project.update({ where: { id: projectId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await loadOwned(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ ok: true });
}
