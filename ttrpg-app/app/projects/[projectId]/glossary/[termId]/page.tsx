import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GlossaryDetailClient } from "@/components/glossary/GlossaryDetailClient";

export const dynamic = "force-dynamic";

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ projectId: string; termId: string }>;
}) {
  const { projectId, termId } = await params;
  const user = await getCurrentUser();

  const term = await prisma.glossaryTerm.findFirst({
    where: { id: termId, projectId, project: { ownerId: user.id } },
  });
  if (!term) notFound();

  const [characters, locations, items, scenes] = await Promise.all([
    prisma.character.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.scene.findMany({
      where: {
        chapter: { act: { projectId } },
        contentText: { contains: term.term },
      },
      include: { chapter: { include: { act: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <GlossaryDetailClient
      projectId={projectId}
      term={{
        id: term.id,
        term: term.term,
        definition: term.definition,
        partOfSpeech: term.partOfSpeech,
        gender: term.gender,
        treatAsProper: term.treatAsProper,
        caseSensitive: term.caseSensitive,
        conjugationJson: term.conjugationJson,
        relatedCharacterId: term.relatedCharacterId,
        relatedLocationId: term.relatedLocationId,
        relatedItemId: term.relatedItemId,
      }}
      characters={characters}
      locations={locations}
      items={items}
      appearances={scenes.map((s) => ({
        id: s.id,
        title: s.title,
        chapterTitle: s.chapter.title,
        actTitle: s.chapter.act.title,
      }))}
    />
  );
}
