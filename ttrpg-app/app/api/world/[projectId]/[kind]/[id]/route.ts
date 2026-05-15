import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const LocationPatch = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  metaJson: z.unknown().optional(),
});
const ItemPatch = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  metaJson: z.unknown().optional(),
});

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; kind: string; id: string }> },
) {
  const { projectId, kind, id } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();

  if (kind === "location") {
    const loc = await prisma.location.findFirst({ where: { id, projectId } });
    if (!loc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const parsed = LocationPatch.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
    }
    // Evita ciclo: parentId não pode ser o próprio id
    if (parsed.data.parentId === id) {
      return NextResponse.json({ error: "cycle_self" }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.parentId !== undefined) data.parentId = parsed.data.parentId;
    if (parsed.data.metaJson !== undefined)
      data.metaJson =
        parsed.data.metaJson === null ? null : JSON.stringify(parsed.data.metaJson);
    await prisma.location.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  if (kind === "item") {
    const it = await prisma.item.findFirst({ where: { id, projectId } });
    if (!it) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const parsed = ItemPatch.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.metaJson !== undefined)
      data.metaJson =
        parsed.data.metaJson === null ? null : JSON.stringify(parsed.data.metaJson);
    await prisma.item.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; kind: string; id: string }> },
) {
  const { projectId, kind, id } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (kind === "location") {
    const loc = await prisma.location.findFirst({ where: { id, projectId } });
    if (!loc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.location.delete({ where: { id } });
  } else if (kind === "item") {
    const it = await prisma.item.findFirst({ where: { id, projectId } });
    if (!it) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.item.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
