import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { WorldClient } from "@/components/world/WorldClient";

export const dynamic = "force-dynamic";

export default async function WorldPage({
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

  const [locations, items] = await Promise.all([
    prisma.location.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <WorldClient
      projectId={projectId}
      locations={locations.map((l) => ({ id: l.id, name: l.name, description: l.description }))}
      items={items.map((i) => ({ id: i.id, name: i.name, description: i.description }))}
    />
  );
}
