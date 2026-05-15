import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PrintView } from "@/components/export/PrintView";
import {
  isExportKind,
  isWritingStyle,
  type ExportKind,
  type WritingStyle,
} from "@/lib/export/style";
import { safeParseTiptapJson, tiptapJsonToHtml } from "@/lib/export/renderTiptap";

export const dynamic = "force-dynamic";

type SceneOut = { id: string; title: string; html: string };
type ChapterOut = { id: string; title: string; summary: string | null; scenes: SceneOut[] };
type ActOut = { id: string; title: string; chapters: ChapterOut[] };

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ kind?: string; id?: string; style?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const kind: ExportKind = isExportKind(sp.kind) ? sp.kind : "project";
  const style: WritingStyle = isWritingStyle(sp.style) ? sp.style : "FORMAL";

  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: { system: true },
  });
  if (!project) notFound();

  const acts: ActOut[] = await buildTree(projectId, kind, sp.id ?? projectId);
  if (kind !== "project" && acts.length === 0) notFound();

  const glossary =
    kind === "project"
      ? await prisma.glossaryTerm.findMany({
          where: { projectId },
          orderBy: { term: "asc" },
        })
      : [];
  const lore =
    kind === "project"
      ? await prisma.lore.findMany({
          where: { projectId },
          orderBy: [{ category: "asc" }, { title: "asc" }],
        })
      : [];

  return (
    <PrintView
      style={style}
      kind={kind}
      project={{
        title: project.title,
        summary: project.summary,
        system: project.system?.name ?? null,
      }}
      acts={acts}
      glossary={glossary.map((g) => ({ term: g.term, definition: g.definition }))}
      lore={lore.map((l) => ({ title: l.title, category: l.category, body: l.body }))}
    />
  );
}

async function buildTree(
  projectId: string,
  kind: ExportKind,
  id: string,
): Promise<ActOut[]> {
  if (kind === "scene") {
    const scene = await prisma.scene.findFirst({
      where: { id, chapter: { act: { projectId } } },
      include: { chapter: { include: { act: true } } },
    });
    if (!scene) return [];
    return [
      {
        id: scene.chapter.act.id,
        title: scene.chapter.act.title,
        chapters: [
          {
            id: scene.chapter.id,
            title: scene.chapter.title,
            summary: scene.chapter.summary,
            scenes: [
              {
                id: scene.id,
                title: scene.title,
                html: tiptapJsonToHtml(safeParseTiptapJson(scene.contentJson)),
              },
            ],
          },
        ],
      },
    ];
  }

  if (kind === "chapter") {
    const chapter = await prisma.chapter.findFirst({
      where: { id, act: { projectId } },
      include: {
        act: true,
        scenes: { orderBy: { order: "asc" } },
      },
    });
    if (!chapter) return [];
    return [
      {
        id: chapter.act.id,
        title: chapter.act.title,
        chapters: [
          {
            id: chapter.id,
            title: chapter.title,
            summary: chapter.summary,
            scenes: chapter.scenes.map((s) => ({
              id: s.id,
              title: s.title,
              html: tiptapJsonToHtml(safeParseTiptapJson(s.contentJson)),
            })),
          },
        ],
      },
    ];
  }

  if (kind === "act") {
    const act = await prisma.act.findFirst({
      where: { id, projectId },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: { scenes: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!act) return [];
    return [
      {
        id: act.id,
        title: act.title,
        chapters: act.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
          scenes: c.scenes.map((s) => ({
            id: s.id,
            title: s.title,
            html: tiptapJsonToHtml(safeParseTiptapJson(s.contentJson)),
          })),
        })),
      },
    ];
  }

  // project
  const acts = await prisma.act.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { scenes: { orderBy: { order: "asc" } } },
      },
    },
  });
  return acts.map((a) => ({
    id: a.id,
    title: a.title,
    chapters: a.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      scenes: c.scenes.map((s) => ({
        id: s.id,
        title: s.title,
        html: tiptapJsonToHtml(safeParseTiptapJson(s.contentJson)),
      })),
    })),
  }));
}
