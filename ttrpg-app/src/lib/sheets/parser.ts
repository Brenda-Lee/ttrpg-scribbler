import { z } from "zod";
import { BODY_REGIONS, CONDITION_SEVERITIES } from "@/lib/bodyRegions";
import { FIELD_TYPES, type SheetSchema } from "./types";

const FieldValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(FieldValueSchema),
    z.record(z.string(), FieldValueSchema),
  ]),
);

const FieldSchemaShape: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      id: z.string().min(1, "field.id must be non-empty"),
      label: z.string().optional(),
      type: z.enum(FIELD_TYPES),
      default: FieldValueSchema.optional(),
      options: z.array(z.string().min(1)).optional(),
      unit: z.string().optional(),
      formula: z.string().optional(),
      itemSchema: z.array(FieldSchemaShape).optional(),
    })
    .strict()
    .superRefine((field, ctx) => {
      if (field.type === "select") {
        if (!field.options || field.options.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "select field requires non-empty `options`",
          });
        }
      }
      if (field.type === "derived") {
        if (!field.formula || field.formula.trim().length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "derived field requires non-empty `formula`",
          });
        }
      }
      if (field.type === "repeating-list") {
        if (!field.itemSchema || field.itemSchema.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: "repeating-list field requires non-empty `itemSchema`",
          });
        }
      }
    }),
);

const SectionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    fields: z.array(FieldSchemaShape).min(1),
  })
  .strict();

const ModifierSchema = z
  .object({
    field: z.string().min(1),
    delta: z.number(),
    reason: z.string().optional(),
  })
  .strict();

const InjuryPresetSchema = z
  .object({
    region: z.enum(BODY_REGIONS),
    severity: z.enum(CONDITION_SEVERITIES),
    modifiers: z.array(ModifierSchema).min(1),
  })
  .strict();

export const SheetSchemaZ = z
  .object({
    systemSlug: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    sections: z.array(SectionSchema).min(1),
    injuryPresets: z.array(InjuryPresetSchema),
  })
  .strict();

export function parseSheetSchema(raw: unknown): SheetSchema {
  return SheetSchemaZ.parse(raw) as SheetSchema;
}
