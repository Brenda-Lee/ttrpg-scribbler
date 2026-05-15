import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PER_GROUP_LIMIT = 8;

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const user = await getCurrentUser();
  const owned = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({
      characters: [],
      locations: [],
      items: [],
      lore: [],
      glossary: [],
      scenes: [],
    });
  }

  const [characters, locations, items, lore, glossary, scenes] = await Promise.all([
    prisma.character.findMany({
      where: { projectId, name: { contains: q } },
      take: PER_GROUP_LIMIT,
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.location.findMany({
      where: { projectId, name: { contains: q } },
      take: PER_GROUP_LIMIT,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.item.findMany({
      where: { projectId, name: { contains: q } },
      take: PER_GROUP_LIMIT,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lore.findMany({
      where: {
        projectId,
        OR: [{ title: { contains: q } }, { excerpt: { contains: q } }],
      },
      take: PER_GROUP_LIMIT,
      orderBy: { title: "asc" },
      select: { id: true, title: true, category: true },
    }),
    prisma.glossaryTerm.findMany({
      where: { projectId, term: { contains: q } },
      take: PER_GROUP_LIMIT,
      orderBy: { term: "asc" },
      select: { id: true, term: true, definition: true },
    }),
    prisma.scene.findMany({
      where: {
        chapter: { act: { projectId } },
        OR: [{ title: { contains: q } }, { contentText: { contains: q } }],
      },
      take: PER_GROUP_LIMIT,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        chapter: { select: { id: true, title: true, act: { select: { title: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    characters,
    locations,
    items,
    lore,
    glossary,
    scenes: scenes.map((s) => ({
      id: s.id,
      title: s.title,
      chapter: s.chapter.title,
      act: s.chapter.act.title,
    })),
  });
}
