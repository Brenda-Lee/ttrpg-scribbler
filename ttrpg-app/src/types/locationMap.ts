import { z } from "zod";

export const LinkedEntityKindSchema = z.enum(["character", "location", "item"]);
export type LinkedEntityKind = z.infer<typeof LinkedEntityKindSchema>;

export const LinkedEntitySchema = z.object({
  type: LinkedEntityKindSchema,
  id: z.string().min(1),
});
export type LinkedEntity = z.infer<typeof LinkedEntitySchema>;

export const MarkerSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().default(""),
  linkedEntity: LinkedEntitySchema.optional(),
});
export type Marker = z.infer<typeof MarkerSchema>;

export const MapDataSchema = z.object({
  imagePath: z.string().optional(),
  markers: z.array(MarkerSchema).optional(),
});
export type MapData = z.infer<typeof MapDataSchema>;

/**
 * Parser tolerante a falhas usado ao carregar metaJson antigo.
 * Retorna sempre um MapData válido (potencialmente vazio).
 */
export function parseMapData(raw: unknown): MapData {
  const result = MapDataSchema.safeParse(raw);
  if (result.success) return result.data;
  return {};
}
