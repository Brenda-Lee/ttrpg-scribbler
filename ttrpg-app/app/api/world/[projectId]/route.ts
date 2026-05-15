import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const LocationSchema = z.object({
  kind: z.literal("location"),
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});
const ItemSchema = z.object({
  kind: z.literal("item"),
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
});

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = z.discriminatedUnion("kind", [LocationSchema, ItemSchema]).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.kind === "location") {
    const created = await prisma.location.create({
      data: {
        projectId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        parentId: parsed.data.parentId ?? null,
      },
    });
    return NextResponse.json(created);
  }
  const created = await prisma.item.create({
    data: {
      projectId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });
  return NextResponse.json(created);
}
