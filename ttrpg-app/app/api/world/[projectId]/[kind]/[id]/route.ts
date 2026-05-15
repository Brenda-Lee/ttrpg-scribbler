import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; kind: string; id: string }> },
) {
  const { projectId, kind, id } = await ctx.params;
  const user = await getCurrentUser();
  const owner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
