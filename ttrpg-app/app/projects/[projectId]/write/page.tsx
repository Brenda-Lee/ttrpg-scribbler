import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SceneCard } from "@/components/scenes/SceneCard";
import { StructureActions } from "@/components/scenes/StructureActions";
import { ActHeader } from "@/components/scenes/ActHeader";
import { ChapterHeader } from "@/components/scenes/ChapterHeader";
import { ChapterSummary } from "@/components/scenes/ChapterSummary";
import { ChapterTagsField } from "@/components/scenes/ChapterTagsField";
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-8 py-8">
      {project.acts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>Comece criando o primeiro Ato da sua história.</p>
          <div className="mt-3 inline-flex">
            <StructureActions
              action={createAct}
              hidden={{ projectId: project.id }}
              placeholder="Título do Ato"
              label="Adicionar Ato"
            />
          </div>
        </div>
      ) : null}

      {project.acts.map((act) => (
        <section key={act.id} className="space-y-3">
          <ActHeader
            actId={act.id}
            title={act.title}
            rightSlot={
              <StructureActions
                action={createChapter}
                hidden={{ projectId: project.id, actId: act.id }}
                placeholder="Título do Capítulo"
                label="Adicionar Capítulo"
              />
            }
          />

          {act.chapters.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum capítulo ainda neste ato.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {act.chapters.map((ch) => (
                <div key={ch.id} className="space-y-3 rounded-lg border bg-card/40 p-3">
                  <ChapterHeader chapterId={ch.id} title={ch.title} />
                  <ChapterSummary chapterId={ch.id} summary={ch.summary} />
                  <ChapterTagsField
                    chapterId={ch.id}
                    allCharacters={project.characters}
                    selectedCharacterIds={ch.characters.map((cc) => cc.characterId)}
                    allTags={project.tags}
                    selectedTagNames={ch.tags.map((ct) => ct.tag.name)}
                  />
                  <div className="space-y-2">
                    {ch.scenes.map((s) => (
                      <SceneCard
                        key={s.id}
                        projectId={project.id}
                        sceneId={s.id}
                        title={s.title}
                        snippet={s.contentText.slice(0, 160)}
                        status={s.status}
                        wordCount={s.wordCount}
                      />
                    ))}
                  </div>
                  <StructureActions
                    action={createScene}
                    hidden={{ projectId: project.id, chapterId: ch.id }}
                    placeholder="Título da Cena"
                    label="Adicionar Cena"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {project.acts.length > 0 ? (
        <div className="pt-2">
          <StructureActions
            action={createAct}
            hidden={{ projectId: project.id }}
            placeholder="Título do Ato"
            label="Adicionar Ato"
          />
        </div>
      ) : null}
    </div>
  );
}
