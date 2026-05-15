import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ExportPicker } from "@/components/export/ExportPicker";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: {
      acts: {
        orderBy: { order: "asc" },
        include: {
          chapters: {
            orderBy: { order: "asc" },
            include: {
              scenes: { orderBy: { order: "asc" }, select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();

  return (
    <ExportPicker
      projectId={projectId}
      projectTitle={project.title}
      tree={project.acts.map((a) => ({
        id: a.id,
        title: a.title,
        chapters: a.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          scenes: c.scenes.map((s) => ({ id: s.id, title: s.title })),
        })),
      }))}
    />
  );
}
