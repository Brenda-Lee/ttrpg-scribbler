import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const PatchSchema = z.object({
  term: z.string().min(1).max(120).optional(),
  definition: z.string().min(1).optional(),
  partOfSpeech: z
    .enum(["NOUN", "VERB", "ADJ", "ADV", "PROPER_NOUN", "OTHER"])
    .optional(),
  gender: z.enum(["M", "F", "N"]).nullable().optional(),
  treatAsProper: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  conjugationJson: z.unknown().optional(),
  relatedCharacterId: z.string().nullable().optional(),
  relatedLocationId: z.string().nullable().optional(),
  relatedItemId: z.string().nullable().optional(),
});

async function loadOwnedTerm(projectId: string, termId: string) {
  const user = await getCurrentUser();
  return prisma.glossaryTerm.findFirst({
    where: { id: termId, projectId, project: { ownerId: user.id } },
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; termId: string }> },
) {
  const { projectId, termId } = await ctx.params;
  const existing = await loadOwnedTerm(projectId, termId);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.term !== undefined) {
    data.term = parsed.data.term;
    data.slug = slugify(parsed.data.term);
  }
  if (parsed.data.definition !== undefined) data.definition = parsed.data.definition;
  if (parsed.data.partOfSpeech !== undefined) data.partOfSpeech = parsed.data.partOfSpeech;
  if (parsed.data.gender !== undefined) data.gender = parsed.data.gender;
  if (parsed.data.treatAsProper !== undefined) data.treatAsProper = parsed.data.treatAsProper;
  if (parsed.data.caseSensitive !== undefined) data.caseSensitive = parsed.data.caseSensitive;
  if (parsed.data.conjugationJson !== undefined)
    data.conjugationJson =
      parsed.data.conjugationJson === null ? null : JSON.stringify(parsed.data.conjugationJson);
  if (parsed.data.relatedCharacterId !== undefined)
    data.relatedCharacterId = parsed.data.relatedCharacterId;
  if (parsed.data.relatedLocationId !== undefined)
    data.relatedLocationId = parsed.data.relatedLocationId;
  if (parsed.data.relatedItemId !== undefined) data.relatedItemId = parsed.data.relatedItemId;

  try {
    await prisma.glossaryTerm.update({ where: { id: termId }, data });
  } catch {
    return NextResponse.json({ error: "duplicate_slug" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; termId: string }> },
) {
  const { projectId, termId } = await ctx.params;
  const t = await loadOwnedTerm(projectId, termId);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.glossaryTerm.delete({ where: { id: termId } });
  return NextResponse.json({ ok: true });
}
