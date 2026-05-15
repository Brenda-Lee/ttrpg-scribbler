import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function loadOwnedTerm(projectId: string, termId: string) {
  const user = await getCurrentUser();
  return prisma.glossaryTerm.findFirst({
    where: { id: termId, projectId, project: { ownerId: user.id } },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; termId: string }> },
) {
  const { projectId, termId } = await ctx.params;
  const t = await loadOwnedTerm(projectId, termId);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.glossaryTerm.delete({ where: { id: termId } });
  return NextResponse.json({ ok: true });
}
