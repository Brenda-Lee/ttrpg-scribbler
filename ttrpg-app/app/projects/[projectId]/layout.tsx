import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TopTabs } from "@/components/shell/TopTabs";
import { LeftSidebar } from "@/components/shell/LeftSidebar";
import { RightPanel } from "@/components/shell/RightPanel";
import { CommandPalette } from "@/components/shell/CommandPalette";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: {
      characters: { orderBy: { name: "asc" } },
      locations: { orderBy: { name: "asc" } },
      items: { orderBy: { name: "asc" } },
      lore: { orderBy: { title: "asc" } },
    },
  });
  if (!project) notFound();

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <TopTabs projectId={project.id} projectTitle={project.title} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          projectId={project.id}
          characters={project.characters.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
          }))}
          locations={project.locations.map((l) => ({ id: l.id, name: l.name }))}
          items={project.items.map((i) => ({ id: i.id, name: i.name }))}
          lore={project.lore.map((l) => ({ id: l.id, name: l.title, role: l.category }))}
        />
        <main className="relative flex-1 overflow-y-auto">{children}</main>
        <RightPanel />
      </div>
      <CommandPalette projectId={project.id} />
    </div>
  );
}
