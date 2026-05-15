import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { WriteTree } from "@/components/scenes/WriteTree";
import { createAct, createChapter, createScene } from "./actions";

export const dynamic = "force-dynamic";

export default async function WritePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: {
      characters: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
      tags: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true },
      },
      acts: {
        orderBy: { order: "asc" },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            include: {
              scenes: { orderBy: { order: "asc" } },
              characters: { select: { characterId: true } },
              tags: { include: { tag: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const acts = project.acts.map((a) => ({
    id: a.id,
    title: a.title,
    order: a.order,
    chapters: a.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      order: c.order,
      actId: c.actId,
      scenes: c.scenes.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        wordCount: s.wordCount,
        contentText: s.contentText,
        order: s.order,
        chapterId: s.chapterId,
      })),
      characterIds: c.characters.map((cc) => cc.characterId),
      tagNames: c.tags.map((ct) => ct.tag.name),
    })),
  }));

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <WriteTree
        projectId={project.id}
        acts={acts}
        characters={project.characters}
        tags={project.tags}
        createAct={createAct}
        createChapter={createChapter}
        createScene={createScene}
      />
    </div>
  );
}
