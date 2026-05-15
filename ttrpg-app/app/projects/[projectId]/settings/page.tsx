import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProjectSettingsClient } from "@/components/projects/ProjectSettingsClient";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const [project, systems] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
    }),
    prisma.system.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!project) notFound();

  return (
    <ProjectSettingsClient
      project={{
        id: project.id,
        title: project.title,
        summary: project.summary,
        systemId: project.systemId,
        status: project.status,
      }}
      systems={systems}
    />
  );
}
