import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LocationDetailClient } from "@/components/world/LocationDetailClient";

export const dynamic = "force-dynamic";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; locationId: string }>;
}) {
  const { projectId, locationId } = await params;
  const user = await getCurrentUser();
  const location = await prisma.location.findFirst({
    where: { id: locationId, projectId, project: { ownerId: user.id } },
  });
  if (!location) notFound();

  const [allLocations, children] = await Promise.all([
    prisma.location.findMany({
      where: { projectId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { projectId, parentId: locationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <LocationDetailClient
      projectId={projectId}
      location={{
        id: location.id,
        name: location.name,
        description: location.description,
        parentId: location.parentId,
        metaJson: location.metaJson,
      }}
      parentOptions={allLocations}
      childLocations={children}
    />
  );
}
