import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const assets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { id: "desc" },
    select: { id: true, kind: true, path: true, mime: true, sizeBytes: true },
  });
  return NextResponse.json({ assets });
}
