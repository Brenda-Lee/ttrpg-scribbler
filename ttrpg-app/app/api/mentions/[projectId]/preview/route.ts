import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mentionPath, type MentionKind } from "@/lib/mentions";

export type MentionPreview = {
  kind: MentionKind;
  entityId: string;
  label: string;
  description?: string;
  body?: string;
  details: Array<{ key: string; value: string }>;
  href: string;
};

const ROLE_LABEL: Record<string, string> = {
  PC: "Personagem jogador",
  NPC: "NPC",
  VILLAIN: "Vilão",
  MONSTER: "Monstro",
};

const POS_LABEL: Record<string, string> = {
  NOUN: "Substantivo",
  VERB: "Verbo",
  ADJ: "Adjetivo",
  ADV: "Advérbio",
  PROPER_NOUN: "Nome próprio",
  OTHER: "Outro",
};

const LORE_CATEGORY_LABEL: Record<string, string> = {
  RELIGION: "Religião",
  FESTIVAL: "Festival",
  CEREMONY: "Cerimônia",
  CULTURE: "Cultura",
  HISTORY: "História",
  OTHER: "Outro",
};

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const user = await getCurrentUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as MentionKind | null;
  const id = url.searchParams.get("id");
  if (!kind || !id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const preview = await loadPreview(projectId, kind, id);
  if (!preview) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ preview });
}

async function loadPreview(
  projectId: string,
  kind: MentionKind,
  entityId: string,
): Promise<MentionPreview | null> {
  const href = mentionPath(projectId, kind, entityId);
  switch (kind) {
    case "character": {
      const c = await prisma.character.findFirst({
        where: { id: entityId, projectId },
      });
      if (!c) return null;
      return {
        kind,
        entityId,
        label: c.name,
        description: c.bio ?? undefined,
        details: [{ key: "Papel", value: ROLE_LABEL[c.role] ?? c.role }],
        href,
      };
    }
    case "location": {
      const l = await prisma.location.findFirst({
        where: { id: entityId, projectId },
        include: { parent: { select: { name: true } } },
      });
      if (!l) return null;
      const details: Array<{ key: string; value: string }> = [];
      if (l.parent?.name) details.push({ key: "Pertence a", value: l.parent.name });
      return {
        kind,
        entityId,
        label: l.name,
        description: l.description ?? undefined,
        details,
        href,
      };
    }
    case "item": {
      const it = await prisma.item.findFirst({
        where: { id: entityId, projectId },
      });
      if (!it) return null;
      return {
        kind,
        entityId,
        label: it.name,
        description: it.description ?? undefined,
        details: [],
        href,
      };
    }
    case "lore": {
      const lo = await prisma.lore.findFirst({
        where: { id: entityId, projectId },
      });
      if (!lo) return null;
      return {
        kind,
        entityId,
        label: lo.title,
        description: lo.excerpt ?? undefined,
        body: lo.body || undefined,
        details: [
          { key: "Categoria", value: LORE_CATEGORY_LABEL[lo.category] ?? lo.category },
        ],
        href,
      };
    }
    case "glossary": {
      const t = await prisma.glossaryTerm.findFirst({
        where: { id: entityId, projectId },
      });
      if (!t) return null;
      const details: Array<{ key: string; value: string }> = [
        { key: "Classe", value: POS_LABEL[t.partOfSpeech] ?? t.partOfSpeech },
      ];
      if (t.gender) {
        details.push({
          key: "Gênero",
          value: t.gender === "M" ? "Masculino" : t.gender === "F" ? "Feminino" : "Neutro",
        });
      }
      if (t.treatAsProper) details.push({ key: "Tipo", value: "Nome próprio" });
      return {
        kind,
        entityId,
        label: t.term,
        description: t.definition,
        details,
        href,
      };
    }
  }
}
