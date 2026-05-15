import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TimelineClient } from "@/components/timeline/TimelineClient";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) notFound();

  const events = await prisma.event.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <TimelineClient
      projectId={projectId}
      initialEvents={events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        dateLabel: e.dateLabel,
        sortOrder: e.sortOrder,
        color: e.color,
      }))}
    />
  );
}
