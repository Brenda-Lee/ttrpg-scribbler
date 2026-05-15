import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LoreDetailClient } from "@/components/lore/LoreDetailClient";

export const dynamic = "force-dynamic";

export default async function LoreDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; loreId: string }>;
}) {
  const { projectId, loreId } = await params;
  const user = await getCurrentUser();
  const lore = await prisma.lore.findFirst({
    where: { id: loreId, projectId, project: { ownerId: user.id } },
  });
  if (!lore) notFound();

  return (
    <LoreDetailClient
      projectId={projectId}
      lore={{
        id: lore.id,
        title: lore.title,
        category: lore.category,
        excerpt: lore.excerpt,
        body: lore.body,
        metaJson: lore.metaJson,
      }}
    />
  );
}
