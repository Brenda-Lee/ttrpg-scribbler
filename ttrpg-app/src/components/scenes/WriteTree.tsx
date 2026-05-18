"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { SceneCard } from "@/components/scenes/SceneCard";
import { StructureActions } from "@/components/scenes/StructureActions";
import { ActHeader } from "@/components/scenes/ActHeader";
import { ChapterHeader } from "@/components/scenes/ChapterHeader";
import { ChapterSummary } from "@/components/scenes/ChapterSummary";
import { ChapterTagsField } from "@/components/scenes/ChapterTagsField";

type SceneDTO = {
  id: string;
  title: string;
  status: string;
  wordCount: number;
  contentText: string;
  order: number;
  chapterId: string;
};

type ChapterDTO = {
  id: string;
  title: string;
  summary: string | null;
  order: number;
  actId: string;
  scenes: SceneDTO[];
  characterIds: string[];
  tagNames: string[];
};

type ActDTO = {
  id: string;
  title: string;
  order: number;
  chapters: ChapterDTO[];
};

type CharOpt = { id: string; name: string };
type TagOpt = { id: string; name: string; color: string };

type Props = {
  projectId: string;
  acts: ActDTO[];
  characters: CharOpt[];
  tags: TagOpt[];
  createAct: (formData: FormData) => Promise<void>;
  createChapter: (formData: FormData) => Promise<void>;
  createScene: (formData: FormData) => Promise<void>;
};

const SCENE_PREFIX = "scene:";
const CHAPTER_PREFIX = "chapter:";
const ACT_PREFIX = "act:";

export function WriteTree({
  projectId,
  acts: initialActs,
  characters,
  tags,
  createAct,
  createChapter,
  createScene,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [acts, setActs] = useState<ActDTO[]>(initialActs);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Quando o servidor revalida (router.refresh), reaplica os dados crus.
  useEffect(() => {
    setActs(initialActs);
  }, [initialActs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const actIds = useMemo(() => acts.map((a) => `${ACT_PREFIX}${a.id}`), [acts]);

  const findContainer = useCallback(
    (
      id: string,
    ): { kind: "act" | "chapter" | "scene"; entity: ActDTO | ChapterDTO | SceneDTO } | null => {
      if (id.startsWith(ACT_PREFIX)) {
        const real = id.slice(ACT_PREFIX.length);
        const a = acts.find((x) => x.id === real);
        return a ? { kind: "act", entity: a } : null;
      }
      if (id.startsWith(CHAPTER_PREFIX)) {
        const real = id.slice(CHAPTER_PREFIX.length);
        for (const a of acts) {
          const c = a.chapters.find((x) => x.id === real);
          if (c) return { kind: "chapter", entity: c };
        }
      }
      if (id.startsWith(SCENE_PREFIX)) {
        const real = id.slice(SCENE_PREFIX.length);
        for (const a of acts) {
          for (const c of a.chapters) {
            const s = c.scenes.find((x) => x.id === real);
            if (s) return { kind: "scene", entity: s };
          }
        }
      }
      return null;
    },
    [acts],
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    // Mover cena entre capítulos durante o drag, para feedback visual.
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith(SCENE_PREFIX)) return;

    const activeContainer = findContainer(activeId);
    if (!activeContainer || activeContainer.kind !== "scene") return;
    const activeScene = activeContainer.entity as SceneDTO;

    let targetChapterId: string | null = null;
    if (overId.startsWith(CHAPTER_PREFIX)) {
      targetChapterId = overId.slice(CHAPTER_PREFIX.length);
    } else if (overId.startsWith(SCENE_PREFIX)) {
      const overContainer = findContainer(overId);
      if (overContainer && overContainer.kind === "scene") {
        targetChapterId = (overContainer.entity as SceneDTO).chapterId;
      }
    }
    if (!targetChapterId || targetChapterId === activeScene.chapterId) return;

    setActs((prev) => {
      const next = prev.map((a) => ({ ...a, chapters: a.chapters.map((c) => ({ ...c, scenes: [...c.scenes] })) }));
      let removed: SceneDTO | null = null;
      for (const a of next) {
        for (const c of a.chapters) {
          const idx = c.scenes.findIndex((s) => s.id === activeScene.id);
          if (idx >= 0) {
            removed = c.scenes.splice(idx, 1)[0]!;
            break;
          }
        }
        if (removed) break;
      }
      if (!removed) return prev;
      removed.chapterId = targetChapterId!;
      outer: for (const a of next) {
        for (const c of a.chapters) {
          if (c.id === targetChapterId) {
            c.scenes.push(removed);
            break outer;
          }
        }
      }
      return next;
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith(ACT_PREFIX) && overId.startsWith(ACT_PREFIX)) {
      const oldIndex = acts.findIndex((a) => `${ACT_PREFIX}${a.id}` === activeId);
      const newIndex = acts.findIndex((a) => `${ACT_PREFIX}${a.id}` === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(acts, oldIndex, newIndex);
      setActs(reordered);
      await persist("/api/acts/reorder", {
        projectId,
        items: reordered.map((a, i) => ({ id: a.id, order: i })),
      });
      return;
    }

    if (activeId.startsWith(CHAPTER_PREFIX)) {
      // Reorder de capítulo. Por enquanto, só dentro do mesmo ato.
      const realActive = activeId.slice(CHAPTER_PREFIX.length);
      const overReal = overId.startsWith(CHAPTER_PREFIX) ? overId.slice(CHAPTER_PREFIX.length) : null;
      if (!overReal) return;
      const sourceAct = acts.find((a) => a.chapters.some((c) => c.id === realActive));
      const targetAct = acts.find((a) => a.chapters.some((c) => c.id === overReal));
      if (!sourceAct || !targetAct || sourceAct.id !== targetAct.id) return;
      const oldIndex = sourceAct.chapters.findIndex((c) => c.id === realActive);
      const newIndex = sourceAct.chapters.findIndex((c) => c.id === overReal);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(sourceAct.chapters, oldIndex, newIndex);
      setActs((prev) =>
        prev.map((a) =>
          a.id === sourceAct.id ? { ...a, chapters: reordered } : a,
        ),
      );
      await persist("/api/chapters/reorder", {
        projectId,
        items: reordered.map((c, i) => ({ id: c.id, order: i })),
      });
      return;
    }

    if (activeId.startsWith(SCENE_PREFIX)) {
      const realActive = activeId.slice(SCENE_PREFIX.length);
      // Após o onDragOver já movemos entre capítulos; agora só ordenamos dentro do destino.
      let hostChapter: ChapterDTO | null = null;
      for (const a of acts) {
        for (const c of a.chapters) {
          if (c.scenes.some((s) => s.id === realActive)) {
            hostChapter = c;
            break;
          }
        }
        if (hostChapter) break;
      }
      if (!hostChapter) return;

      let newIndex = hostChapter.scenes.findIndex((s) => s.id === realActive);
      if (overId.startsWith(SCENE_PREFIX)) {
        const overReal = overId.slice(SCENE_PREFIX.length);
        const idx = hostChapter.scenes.findIndex((s) => s.id === overReal);
        if (idx >= 0) newIndex = idx;
      }
      const oldIndex = hostChapter.scenes.findIndex((s) => s.id === realActive);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(hostChapter.scenes, oldIndex, newIndex);
      const targetChapterId = hostChapter.id;
      setActs((prev) =>
        prev.map((a) => ({
          ...a,
          chapters: a.chapters.map((c) =>
            c.id === targetChapterId ? { ...c, scenes: reordered } : c,
          ),
        })),
      );
      await persist("/api/scenes/reorder", {
        projectId,
        items: reordered.map((s, i) => ({
          id: s.id,
          order: i,
          chapterId: targetChapterId,
        })),
      });
    }
  }

  async function persist(url: string, payload: unknown) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar nova ordem.");
        startTransition(() => router.refresh());
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao salvar nova ordem.");
      startTransition(() => router.refresh());
    }
  }

  const activeLabel = useMemo(() => {
    if (!activeId) return null;
    const found = findContainer(activeId);
    if (!found) return null;
    if (found.kind === "act") return `Ato: ${(found.entity as ActDTO).title}`;
    if (found.kind === "chapter") return `Capítulo: ${(found.entity as ChapterDTO).title}`;
    if (found.kind === "scene") return `Cena: ${(found.entity as SceneDTO).title}`;
    return null;
  }, [activeId, findContainer]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={activeId?.startsWith(SCENE_PREFIX) ? closestCorners : closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-10">
        {acts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            <p>Comece criando o primeiro Ato da sua história.</p>
            <div className="mt-3 inline-flex">
              <StructureActions
                action={createAct}
                hidden={{ projectId }}
                placeholder="Título do Ato"
                label="Adicionar Ato"
              />
            </div>
          </div>
        ) : null}

        <SortableContext items={actIds} strategy={verticalListSortingStrategy}>
          {acts.map((act) => (
            <SortableAct
              key={act.id}
              act={act}
              projectId={projectId}
              characters={characters}
              tags={tags}
              createChapter={createChapter}
              createScene={createScene}
            />
          ))}
        </SortableContext>

        {acts.length > 0 ? (
          <div className="pt-2">
            <StructureActions
              action={createAct}
              hidden={{ projectId }}
              placeholder="Título do Ato"
              label="Adicionar Ato"
            />
          </div>
        ) : null}
      </div>

      <DragOverlay>
        {activeLabel ? (
          <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableAct({
  act,
  projectId,
  characters,
  tags,
  createChapter,
  createScene,
}: {
  act: ActDTO;
  projectId: string;
  characters: CharOpt[];
  tags: TagOpt[];
  createChapter: (formData: FormData) => Promise<void>;
  createScene: (formData: FormData) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${ACT_PREFIX}${act.id}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const chapterIds = act.chapters.map((c) => `${CHAPTER_PREFIX}${c.id}`);

  return (
    <section ref={setNodeRef} style={style} className="space-y-3">
      <div className="flex items-center gap-1">
        <DragHandle attributes={attributes} listeners={listeners} label={`Arrastar ato ${act.title}`} />
        <div className="flex-1">
          <ActHeader
            actId={act.id}
            title={act.title}
            rightSlot={
              <StructureActions
                action={createChapter}
                hidden={{ projectId, actId: act.id }}
                placeholder="Título do Capítulo"
                label="Adicionar Capítulo"
              />
            }
          />
        </div>
      </div>

      {act.chapters.length === 0 ? (
        <p className="ml-7 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum capítulo ainda neste ato.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
            {act.chapters.map((ch) => (
              <SortableChapter
                key={ch.id}
                chapter={ch}
                projectId={projectId}
                characters={characters}
                tags={tags}
                createScene={createScene}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </section>
  );
}

function SortableChapter({
  chapter,
  projectId,
  characters,
  tags,
  createScene,
}: {
  chapter: ChapterDTO;
  projectId: string;
  characters: CharOpt[];
  tags: TagOpt[];
  createScene: (formData: FormData) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${CHAPTER_PREFIX}${chapter.id}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const sceneIds = chapter.scenes.map((s) => `${SCENE_PREFIX}${s.id}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-chapter-id={chapter.id}
      className="min-w-0 space-y-3 overflow-hidden rounded-lg border bg-card/40 p-3"
    >
      <div className="flex items-start gap-1">
        <DragHandle
          attributes={attributes}
          listeners={listeners}
          label={`Arrastar capítulo ${chapter.title}`}
        />
        <div className="min-w-0 flex-1">
          <ChapterHeader chapterId={chapter.id} title={chapter.title} />
        </div>
      </div>
      <ChapterSummary chapterId={chapter.id} summary={chapter.summary} />
      <ChapterTagsField
        chapterId={chapter.id}
        allCharacters={characters}
        selectedCharacterIds={chapter.characterIds}
        allTags={tags}
        selectedTagNames={chapter.tagNames}
      />
      <div className="space-y-2 min-h-4">
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {chapter.scenes.map((s) => (
            <SortableScene
              key={s.id}
              scene={s}
              projectId={projectId}
            />
          ))}
        </SortableContext>
      </div>
      <StructureActions
        action={createScene}
        hidden={{ projectId, chapterId: chapter.id }}
        placeholder="Título da Cena"
        label="Adicionar Cena"
      />
    </div>
  );
}

function SortableScene({ scene, projectId }: { scene: SceneDTO; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${SCENE_PREFIX}${scene.id}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <DragHandle
        attributes={attributes}
        listeners={listeners}
        label={`Arrastar cena ${scene.title}`}
        className="mt-2"
      />
      <div className="min-w-0 flex-1">
        <SceneCard
          projectId={projectId}
          sceneId={scene.id}
          title={scene.title}
          snippet={scene.contentText.slice(0, 160)}
          status={scene.status}
          wordCount={scene.wordCount}
        />
      </div>
    </div>
  );
}

function DragHandle({
  attributes,
  listeners,
  label,
  className,
}: {
  attributes: React.HTMLAttributes<HTMLButtonElement>;
  listeners: React.DOMAttributes<HTMLButtonElement> | undefined;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      {...attributes}
      {...listeners}
      className={
        "flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing " +
        (className ?? "")
      }
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
