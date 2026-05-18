import type { FieldValue, SheetField, SheetSchema } from "./types";

function defaultFor(field: SheetField): FieldValue | undefined {
  if (field.type === "derived") return undefined;
  if (field.default !== undefined) return field.default;
  switch (field.type) {
    case "text":
    case "textarea":
      return "";
    case "number":
      return 0;
    case "checkbox":
      return false;
    case "select":
      return field.options?.[0] ?? "";
    case "repeating-list":
      return [];
    default:
      return undefined;
  }
}

export function extractDefaults(schema: SheetSchema): Record<string, FieldValue> {
  return extractItemDefaults(schema.sections.flatMap((section) => section.fields));
}

/**
 * Builds a default payload for a single `repeating-list` row from its
 * `itemSchema`. Used by `RepeatingListField` to seed newly-appended rows
 * and by tests that want a deterministic empty row.
 */
export function extractItemDefaults(
  fields: readonly SheetField[],
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const field of fields) {
    const value = defaultFor(field);
    if (value === undefined) continue;
    out[field.id] = value;
  }
  return out;
}
