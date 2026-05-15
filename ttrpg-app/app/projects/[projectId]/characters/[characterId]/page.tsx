import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CharacterDetailClient } from "@/components/characters/CharacterDetailClient";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; characterId: string }>;
}) {
  const { projectId, characterId } = await params;
  const user = await getCurrentUser();
  const character = await prisma.character.findFirst({
    where: { id: characterId, projectId, project: { ownerId: user.id } },
  });
  if (!character) notFound();

  return (
    <CharacterDetailClient
      projectId={projectId}
      character={{
        id: character.id,
        name: character.name,
        role: character.role,
        bio: character.bio,
        attributesJson: character.attributesJson,
      }}
    />
  );
}
