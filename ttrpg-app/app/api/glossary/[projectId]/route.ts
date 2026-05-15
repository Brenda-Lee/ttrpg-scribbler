import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const PostSchema = z.object({
  term: z.string().min(1).max(120),
  definition: z.string().min(1),
  partOfSpeech: z
    .enum(["NOUN", "VERB", "ADJ", "ADV", "PROPER_NOUN", "OTHER"])
    .default("NOUN"),
  gender: z.enum(["M", "F", "N"]).optional().nullable(),
  treatAsProper: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  conjugationJson: z.unknown().optional(),
  relatedCharacterId: z.string().optional().nullable(),
  relatedLocationId: z.string().optional().nullable(),
  relatedItemId: z.string().optional().nullable(),
});

async function assertProjectOwner(projectId: string) {
  const user = await getCurrentUser();
  const p = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  return !!p;
}

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const terms = await prisma.glossaryTerm.findMany({
    where: {
      projectId,
      ...(q
        ? { term: { contains: q } }
        : {}),
    },
    orderBy: { term: "asc" },
    take: 50,
  });

  return NextResponse.json(
    terms.map((t) => ({
      id: t.id,
      term: t.term,
      definition: t.definition,
      partOfSpeech: t.partOfSpeech,
    })),
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  if (!(await assertProjectOwner(projectId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const slug = slugify(parsed.data.term);
  try {
    const created = await prisma.glossaryTerm.create({
      data: {
        projectId,
        term: parsed.data.term,
        slug,
        definition: parsed.data.definition,
        partOfSpeech: parsed.data.partOfSpeech,
        gender: parsed.data.gender ?? null,
        treatAsProper: parsed.data.treatAsProper ?? false,
        caseSensitive: parsed.data.caseSensitive ?? false,
        conjugationJson:
          parsed.data.conjugationJson === undefined
            ? null
            : JSON.stringify(parsed.data.conjugationJson),
        relatedCharacterId: parsed.data.relatedCharacterId ?? null,
        relatedLocationId: parsed.data.relatedLocationId ?? null,
        relatedItemId: parsed.data.relatedItemId ?? null,
      },
    });
    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: "duplicate_slug" }, { status: 409 });
  }
}
