export const WRITING_STYLES = ["COLLOQUIAL", "FORMAL", "ABNT"] as const;
export type WritingStyle = (typeof WRITING_STYLES)[number];

export const WRITING_STYLE_LABEL: Record<WritingStyle, string> = {
  COLLOQUIAL: "Coloquial",
  FORMAL: "Formal",
  ABNT: "ABNT",
};

export function isWritingStyle(v: unknown): v is WritingStyle {
  return typeof v === "string" && (WRITING_STYLES as readonly string[]).includes(v);
}

export const EXPORT_KINDS = ["scene", "chapter", "act", "project"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export function isExportKind(v: unknown): v is ExportKind {
  return typeof v === "string" && (EXPORT_KINDS as readonly string[]).includes(v);
}
