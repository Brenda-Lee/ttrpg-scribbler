import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { TrashedProjectCard } from "@/components/projects/TrashedProjectCard";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Plus, Sparkles, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const tab =
    params?.status === "archived"
      ? "ARCHIVED"
      : params?.status === "trash"
        ? "TRASHED"
        : "ACTIVE";

  const user = await getCurrentUser();
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, status: tab },
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" /> Novo projeto
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto mb-4 flex max-w-6xl items-center gap-2">
        <FilterLink active={tab === "ACTIVE"} href="/projects">
          Ativos
        </FilterLink>
        <FilterLink active={tab === "ARCHIVED"} href="/projects?status=archived">
          <Archive className="h-3.5 w-3.5" /> Arquivados
        </FilterLink>
        <FilterLink active={tab === "TRASHED"} href="/projects?status=trash">
          <Trash2 className="h-3.5 w-3.5" /> Lixeira
        </FilterLink>
      </div>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            {tab === "ARCHIVED"
              ? "Nenhum projeto arquivado."
              : tab === "TRASHED"
                ? "Lixeira vazia."
                : "Nenhum projeto ainda. Crie o primeiro para começar a escrever."}
          </div>
        ) : (
          items.map((p) =>
            tab === "TRASHED" ? (
              <TrashedProjectCard key={p.id} {...p} />
            ) : (
              <ProjectCard key={p.id} {...p} />
            ),
          )
        )}
      </section>
    </main>
  );
}

function FilterLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
