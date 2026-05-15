import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GlossaryClient } from "@/components/glossary/GlossaryClient";

export const dynamic = "force-dynamic";

export default async function GlossaryPage({
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

  const terms = await prisma.glossaryTerm.findMany({
    where: { projectId },
    orderBy: { term: "asc" },
  });

  return (
    <GlossaryClient
      projectId={projectId}
      initialTerms={terms.map((t) => ({
        id: t.id,
        term: t.term,
        definition: t.definition,
        partOfSpeech: t.partOfSpeech,
        gender: t.gender,
        treatAsProper: t.treatAsProper,
        caseSensitive: t.caseSensitive,
      }))}
    />
  );
}
