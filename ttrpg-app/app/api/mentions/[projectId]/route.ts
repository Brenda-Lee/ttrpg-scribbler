import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { MentionItem } from "@/lib/mentions";

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ items: [] }, { status: 404 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = 24;

  const filter = q ? { contains: q } : undefined;

  const [terms, characters, locations, items, lore] = await Promise.all([
    prisma.glossaryTerm.findMany({
      where: {
        projectId,
        ...(filter ? { term: filter } : {}),
      },
      select: { id: true, term: true, definition: true },
      orderBy: { term: "asc" },
      take: limit,
    }),
    prisma.character.findMany({
      where: { projectId, ...(filter ? { name: filter } : {}) },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.location.findMany({
      where: { projectId, ...(filter ? { name: filter } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.item.findMany({
      where: { projectId, ...(filter ? { name: filter } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: limit,
    }),
    prisma.lore.findMany({
      where: { projectId, ...(filter ? { title: filter } : {}) },
      select: { id: true, title: true, category: true },
      orderBy: { title: "asc" },
      take: limit,
    }),
  ]);

  const out: MentionItem[] = [
    ...characters.map((c) => ({
      id: `character-${c.id}`,
      kind: "character" as const,
      entityId: c.id,
      label: c.name,
      hint: c.role,
    })),
    ...locations.map((l) => ({
      id: `location-${l.id}`,
      kind: "location" as const,
      entityId: l.id,
      label: l.name,
    })),
    ...items.map((it) => ({
      id: `item-${it.id}`,
      kind: "item" as const,
      entityId: it.id,
      label: it.name,
    })),
    ...lore.map((l) => ({
      id: `lore-${l.id}`,
      kind: "lore" as const,
      entityId: l.id,
      label: l.title,
      hint: l.category,
    })),
    ...terms.map((t) => ({
      id: `glossary-${t.id}`,
      kind: "glossary" as const,
      entityId: t.id,
      label: t.term,
      hint: t.definition.slice(0, 80),
    })),
  ];

  return NextResponse.json({ items: out.slice(0, 32) });
}
