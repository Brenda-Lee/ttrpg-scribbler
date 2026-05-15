import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ItemDetailClient } from "@/components/world/ItemDetailClient";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; itemId: string }>;
}) {
  const { projectId, itemId } = await params;
  const user = await getCurrentUser();
  const item = await prisma.item.findFirst({
    where: { id: itemId, projectId, project: { ownerId: user.id } },
  });
  if (!item) notFound();

  return (
    <ItemDetailClient
      projectId={projectId}
      item={{
        id: item.id,
        name: item.name,
        description: item.description,
        metaJson: item.metaJson,
      }}
    />
  );
}
