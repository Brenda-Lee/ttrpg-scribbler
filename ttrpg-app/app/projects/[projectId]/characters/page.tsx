import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CharactersClient } from "@/components/characters/CharactersClient";

export const dynamic = "force-dynamic";

export default async function CharactersPage({
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

  const characters = await prisma.character.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });

  return (
    <CharactersClient
      projectId={projectId}
      initialCharacters={characters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        bio: c.bio,
      }))}
    />
  );
}
