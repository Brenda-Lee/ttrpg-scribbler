import type { BodyRegion, ConditionSeverity } from "@/lib/bodyRegions";

export type FieldValue =
  | string
  | number
  | boolean
  | FieldValue[]
  | { [key: string]: FieldValue };

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "checkbox",
  "select",
  "repeating-list",
  "derived",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface SheetField {
  id: string;
  label?: string;
  type: FieldType;
  default?: FieldValue;
  options?: string[];
  unit?: string;
  formula?: string;
  itemSchema?: SheetField[];
}

export interface Modifier {
  field: string;
  delta: number;
  reason?: string;
}

export interface InjuryPreset {
  region: BodyRegion;
  severity: ConditionSeverity;
  modifiers: Modifier[];
}

export interface SheetSection {
  id: string;
  title: string;
  fields: SheetField[];
}

export interface SheetSchema {
  systemSlug: string;
  schemaVersion: number;
  sections: SheetSection[];
  injuryPresets: InjuryPreset[];
}

/**
 * Per-field explanation surfaced in the UI tooltip — produced by `derive`
 * (task 06) and consumed by `DerivedField` (task 13).
 */
export interface BreakdownEntry {
  source: "preset" | "override" | "formula";
  delta?: number;
  reason?: string;
  conditionId?: string;
}

/**
 * Sheet-form value shape: same as `dataJson` once parsed, but typed for the
 * RHF resolver (task 07).
 */
export type SheetFormValues = Record<string, FieldValue>;

export type SheetPatch = Partial<SheetFormValues>;
