import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  dateLabel: z.string().max(120).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  sortOrder: z.number().int().optional(),
});

async function loadOwned(projectId: string, eventId: string) {
  const user = await getCurrentUser();
  return prisma.event.findFirst({
    where: { id: eventId, projectId, project: { ownerId: user.id } },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; eventId: string }> },
) {
  const { projectId, eventId } = await ctx.params;
  const existing = await loadOwned(projectId, eventId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.dateLabel !== undefined) data.dateLabel = parsed.data.dateLabel;
  if (parsed.data.color !== undefined) data.color = parsed.data.color;
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
  await prisma.event.update({ where: { id: eventId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; eventId: string }> },
) {
  const { projectId, eventId } = await ctx.params;
  const existing = await loadOwned(projectId, eventId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
