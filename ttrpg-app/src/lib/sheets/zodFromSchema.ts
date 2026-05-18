import { z } from "zod";
import type {
  SheetField,
  SheetFormValues,
  SheetPatch,
  SheetSchema,
} from "./types";

type Mode = "server" | "form";

const patchCache = new Map<string, z.ZodType<SheetPatch>>();
const resolverCache = new Map<string, z.ZodType<SheetFormValues>>();

function cacheKey(schema: SheetSchema): string {
  return `${schema.systemSlug}:${schema.schemaVersion}`;
}

function fieldToZod(field: SheetField, mode: Mode): z.ZodTypeAny | null {
  switch (field.type) {
    case "text":
    case "textarea":
      return z.string();
    case "number":
      return mode === "form" ? z.coerce.number() : z.number();
    case "checkbox":
      return z.boolean();
    case "select": {
      const options = field.options ?? [];
      if (options.length === 0) return z.string();
      return z.enum(options as [string, ...string[]]);
    }
    case "repeating-list": {
      const items = field.itemSchema ?? [];
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const item of items) {
        const itemZod = fieldToZod(item, mode);
        if (itemZod === null) continue;
        shape[item.id] = mode === "form" ? itemZod : itemZod.optional();
      }
      return z.array(z.object(shape).strict());
    }
    case "derived":
      return null;
    default:
      return null;
  }
}

function buildShape(schema: SheetSchema, mode: Mode): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const zod = fieldToZod(field, mode);
      if (zod === null) continue;
      shape[field.id] = mode === "form" ? zod : zod.optional();
    }
  }
  return shape;
}

export function buildPatchSchema(schema: SheetSchema): z.ZodType<SheetPatch> {
  const key = cacheKey(schema);
  const cached = patchCache.get(key);
  if (cached) return cached;
  const built = z.object(buildShape(schema, "server")).strict() as unknown as z.ZodType<SheetPatch>;
  patchCache.set(key, built);
  return built;
}

export function buildResolverSchema(schema: SheetSchema): z.ZodType<SheetFormValues> {
  const key = cacheKey(schema);
  const cached = resolverCache.get(key);
  if (cached) return cached;
  const built = z.object(buildShape(schema, "form")).strict() as unknown as z.ZodType<SheetFormValues>;
  resolverCache.set(key, built);
  return built;
}

export function clearZodSchemaCache(): void {
  patchCache.clear();
  resolverCache.clear();
}
