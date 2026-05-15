export type MentionKind = "glossary" | "character" | "location" | "item" | "lore";

export type MentionItem = {
  /** Identificador único para a lista (combina kind+entityId). */
  id: string;
  kind: MentionKind;
  /** ID da entidade no banco. */
  entityId: string;
  /** Texto mostrado e inserido como texto da menção. */
  label: string;
  /** Texto secundário (categoria, definição, papel). */
  hint?: string;
};

/**
 * Resolve o caminho do front-end para uma menção.
 */
export function mentionPath(
  projectId: string,
  kind: MentionKind,
  entityId: string,
): string {
  switch (kind) {
    case "character":
      return `/projects/${projectId}/characters/${entityId}`;
    case "location":
      return `/projects/${projectId}/world/locations/${entityId}`;
    case "item":
      return `/projects/${projectId}/world/items/${entityId}`;
    case "lore":
      return `/projects/${projectId}/world/lore/${entityId}`;
    case "glossary":
      return `/projects/${projectId}/glossary/${entityId}`;
  }
}

export const MENTION_KIND_LABEL: Record<MentionKind, string> = {
  glossary: "Glossário",
  character: "Personagens",
  location: "Locais",
  item: "Itens",
  lore: "Lore",
};
