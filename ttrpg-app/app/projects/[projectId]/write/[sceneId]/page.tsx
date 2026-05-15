import Link from "next/link";
import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScenePage({
  params,
}: {
  params: Promise<{ projectId: string; sceneId: string }>;
}) {
  const { projectId, sceneId } = await params;
  const user = await getCurrentUser();

  const scene = await prisma.scene.findFirst({
    where: {
      id: sceneId,
      chapter: { act: { projectId, project: { ownerId: user.id } } },
    },
    include: { chapter: { include: { act: true } } },
  });
  if (!scene) notFound();

  let initial: JSONContent | null = null;
  try {
    initial = scene.contentJson ? (JSON.parse(scene.contentJson) as JSONContent) : null;
  } catch {
    initial = null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-card/40 px-6 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/projects/${projectId}/write`}>
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold leading-none">{scene.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {scene.chapter.act.title} · {scene.chapter.title}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{scene.wordCount} palavras</span>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1">
        <TiptapEditor
          sceneId={scene.id}
          projectId={projectId}
          initialContent={initial}
        />
      </div>
    </div>
  );
}
