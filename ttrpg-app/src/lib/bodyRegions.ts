export const BODY_REGIONS = [
  "HEAD",
  "NECK",
  "TORSO_FRONT",
  "TORSO_BACK",
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_HAND",
  "RIGHT_HAND",
  "LEFT_LEG",
  "RIGHT_LEG",
  "LEFT_FOOT",
  "RIGHT_FOOT",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export const BODY_REGION_LABEL: Record<BodyRegion, string> = {
  HEAD: "Cabeça",
  NECK: "Pescoço",
  TORSO_FRONT: "Tronco (frente)",
  TORSO_BACK: "Tronco (costas)",
  LEFT_ARM: "Braço esquerdo",
  RIGHT_ARM: "Braço direito",
  LEFT_HAND: "Mão esquerda",
  RIGHT_HAND: "Mão direita",
  LEFT_LEG: "Perna esquerda",
  RIGHT_LEG: "Perna direita",
  LEFT_FOOT: "Pé esquerdo",
  RIGHT_FOOT: "Pé direito",
};

export function isBodyRegion(v: unknown): v is BodyRegion {
  return typeof v === "string" && (BODY_REGIONS as readonly string[]).includes(v);
}

export const CONDITION_SEVERITIES = ["LIGHT", "MODERATE", "SEVERE", "CRITICAL"] as const;
export type ConditionSeverity = (typeof CONDITION_SEVERITIES)[number];

export const SEVERITY_LABEL: Record<ConditionSeverity, string> = {
  LIGHT: "Leve",
  MODERATE: "Moderada",
  SEVERE: "Severa",
  CRITICAL: "Crítica",
};

export const SEVERITY_COLOR: Record<ConditionSeverity, string> = {
  LIGHT: "#facc15", // amarelo
  MODERATE: "#fb923c", // laranja
  SEVERE: "#ef4444", // vermelho
  CRITICAL: "#7c3aed", // roxo
};

export function isSeverity(v: unknown): v is ConditionSeverity {
  return typeof v === "string" && (CONDITION_SEVERITIES as readonly string[]).includes(v);
}
