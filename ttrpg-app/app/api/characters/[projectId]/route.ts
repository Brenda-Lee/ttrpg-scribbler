import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.enum(["PC", "NPC", "VILLAIN", "MONSTER"]).default("NPC"),
  bio: z.string().optional().nullable(),
  attributesJson: z.unknown().optional(),
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
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const created = await prisma.character.create({
    data: {
      projectId,
      name: parsed.data.name,
      role: parsed.data.role,
      bio: parsed.data.bio ?? null,
      attributesJson:
        parsed.data.attributesJson === undefined
          ? null
          : JSON.stringify(parsed.data.attributesJson),
    },
  });
  return NextResponse.json(created);
}
