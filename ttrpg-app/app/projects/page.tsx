import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      system: true,
      _count: { select: { characters: true } },
      acts: { include: { chapters: { include: { _count: { select: { scenes: true } } } } } },
    },
  });

  const items = projects.map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
    systemName: p.system?.name ?? null,
    status: p.status,
    characterCount: p._count.characters,
    sceneCount: p.acts.reduce(
      (acc, a) => acc + a.chapters.reduce((cc, c) => cc + c._count.scenes, 0),
      0,
    ),
  }));

  return (
    <main className="min-h-screen px-8 py-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between pb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" />
            TTRPG Scribbler
          </h1>
          <p className="text-sm text-muted-foreground">
            Olá, {user.name}. Suas campanhas e mundos em um só lugar.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" /> Novo projeto
          </Link>
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum projeto ainda. Crie o primeiro para começar a escrever.
          </div>
        ) : (
          items.map((p) => <ProjectCard key={p.id} {...p} />)
        )}
      </section>
    </main>
  );
}
