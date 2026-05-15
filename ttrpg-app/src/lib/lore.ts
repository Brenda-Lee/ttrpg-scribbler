export const LORE_CATEGORIES = [
  "RELIGION",
  "FESTIVAL",
  "CEREMONY",
  "CULTURE",
  "HISTORY",
  "OTHER",
] as const;

export type LoreCategory = (typeof LORE_CATEGORIES)[number];

export const LORE_CATEGORY_LABEL: Record<LoreCategory, string> = {
  RELIGION: "Religião",
  FESTIVAL: "Festival",
  CEREMONY: "Cerimônia",
  CULTURE: "Cultura",
  HISTORY: "História",
  OTHER: "Outro",
};

export const LORE_CATEGORY_COLOR: Record<LoreCategory, string> = {
  RELIGION: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  FESTIVAL: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CEREMONY: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  CULTURE: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  HISTORY: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  OTHER: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};
