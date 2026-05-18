import {
  BODY_REGION_LABEL,
  SEVERITY_LABEL,
  isBodyRegion,
  isSeverity,
  type BodyRegion,
  type ConditionSeverity,
} from "@/lib/bodyRegions";
import type {
  BreakdownEntry,
  FieldValue,
  Modifier,
  SheetSchema,
} from "./types";

export interface ConditionInput {
  id: string;
  region: BodyRegion | string;
  severity: ConditionSeverity | string;
  modifiersJson?: string | null;
}

export interface ApplyModifiersResult {
  values: Record<string, FieldValue>;
  breakdown: Record<string, BreakdownEntry[]>;
}

function pushEntry(
  breakdown: Record<string, BreakdownEntry[]>,
  fieldId: string,
  entry: BreakdownEntry,
): void {
  if (!breakdown[fieldId]) breakdown[fieldId] = [];
  breakdown[fieldId].push(entry);
}

function fallbackReasonFor(condition: ConditionInput): string {
  const regionLabel = isBodyRegion(condition.region)
    ? BODY_REGION_LABEL[condition.region]
    : condition.region;
  const severityLabel = isSeverity(condition.severity)
    ? SEVERITY_LABEL[condition.severity]
    : condition.severity;
  return `${regionLabel} ${severityLabel}`;
}

function parseOverrides(raw: string | null | undefined): Modifier[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: Modifier[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.field !== "string" || candidate.field.length === 0) continue;
    if (typeof candidate.delta !== "number" || !Number.isFinite(candidate.delta)) continue;
    const reason = typeof candidate.reason === "string" ? candidate.reason : undefined;
    out.push({ field: candidate.field, delta: candidate.delta, reason });
  }
  return out;
}

function applyOne(
  values: Record<string, FieldValue>,
  breakdown: Record<string, BreakdownEntry[]>,
  source: "preset" | "override",
  modifier: Modifier,
  conditionId: string,
  fallbackReason: string,
): void {
  const current = values[modifier.field];
  if (typeof current === "number") {
    values[modifier.field] = current + modifier.delta;
    pushEntry(breakdown, modifier.field, {
      source,
      delta: modifier.delta,
      reason: modifier.reason ?? fallbackReason,
      conditionId,
    });
  } else {
    pushEntry(breakdown, modifier.field, {
      source,
      delta: modifier.delta,
      reason: "missing_field",
      conditionId,
    });
  }
}

export function applyModifiers(
  base: Record<string, FieldValue>,
  conditions: readonly ConditionInput[],
  schema: SheetSchema,
): ApplyModifiersResult {
  const values: Record<string, FieldValue> = { ...base };
  const breakdown: Record<string, BreakdownEntry[]> = {};

  const sorted = [...conditions].sort((a, b) => a.id.localeCompare(b.id));

  for (const condition of sorted) {
    const fallback = fallbackReasonFor(condition);

    const preset = schema.injuryPresets.find(
      (p) => p.region === condition.region && p.severity === condition.severity,
    );
    if (preset) {
      for (const modifier of preset.modifiers) {
        applyOne(values, breakdown, "preset", modifier, condition.id, fallback);
      }
    }

    const overrides = parseOverrides(condition.modifiersJson);
    for (const modifier of overrides) {
      applyOne(values, breakdown, "override", modifier, condition.id, fallback);
    }
  }

  return { values, breakdown };
}
