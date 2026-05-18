import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadSheetSchema } from "@/lib/sheets/loadSchema";
import { extractDefaults } from "@/lib/sheets/defaults";

const PostSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.enum(["PC", "NPC", "VILLAIN", "MONSTER"]).default("NPC"),
  bio: z.string().optional().nullable(),
  attributesJson: z.unknown().optional(),
});

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true, system: { select: { slug: true } } },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const project = await assertProjectOwner(projectId);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const schema = await loadSheetSchema(project.system?.slug ?? null);
  const dataJson = JSON.stringify(extractDefaults(schema));

  const created = await prisma.$transaction(async (tx) => {
    const character = await tx.character.create({
      data: {
        projectId,
        name: parsed.data.name,
        role: parsed.data.role,
        bio: parsed.data.bio ?? null,
        attributesJson:
          parsed.data.attributesJson === undefined
            ? null
            : JSON.stringify(parsed.data.attributesJson),
      },
    });
    await tx.characterSheet.create({
      data: {
        characterId: character.id,
        systemSlug: schema.systemSlug,
        schemaVersion: schema.schemaVersion,
        dataJson,
      },
    });
    return character;
  });

  return NextResponse.json(created);
}
