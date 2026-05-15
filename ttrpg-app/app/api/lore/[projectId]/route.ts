import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const LORE_CATEGORIES = [
  "RELIGION",
  "FESTIVAL",
  "CEREMONY",
  "CULTURE",
  "HISTORY",
  "OTHER",
] as const;

const PostSchema = z.object({
  title: z.string().min(1).max(160),
  category: z.enum(LORE_CATEGORIES).default("OTHER"),
  excerpt: z.string().optional().nullable(),
  body: z.string().optional(),
});

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim();
  const q = url.searchParams.get("q")?.trim();
  const lore = await prisma.lore.findMany({
    where: {
      projectId,
      ...(category ? { category } : {}),
      ...(q ? { title: { contains: q } } : {}),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return NextResponse.json(lore);
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
  const created = await prisma.lore.create({
    data: {
      projectId,
      title: parsed.data.title,
      category: parsed.data.category,
      excerpt: parsed.data.excerpt ?? null,
      body: parsed.data.body ?? "",
    },
  });
  return NextResponse.json(created);
}
