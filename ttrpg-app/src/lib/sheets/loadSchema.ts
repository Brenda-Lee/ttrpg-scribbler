import { prisma } from "@/lib/db";
import { BUNDLED_SCHEMAS, GENERIC_SLUG } from "./bundled";
import { parseSheetSchema } from "./parser";
import type { SheetSchema } from "./types";

const schemaCache = new Map<string, SheetSchema>();
const latestVersionBySlug = new Map<string, number>();

function compositeKey(slug: string, version: number): string {
  return `${slug}:${version}`;
}

function readCache(slug: string): SheetSchema | undefined {
  const version = latestVersionBySlug.get(slug);
  if (version === undefined) return undefined;
  return schemaCache.get(compositeKey(slug, version));
}

function writeCache(slug: string, schema: SheetSchema): void {
  schemaCache.set(compositeKey(slug, schema.schemaVersion), schema);
  latestVersionBySlug.set(slug, schema.schemaVersion);
}

function bundledOrGeneric(slug: string): SheetSchema {
  return BUNDLED_SCHEMAS[slug] ?? BUNDLED_SCHEMAS[GENERIC_SLUG];
}

function warnAndFallback(slug: string, reason: string): SheetSchema {
  const schema = bundledOrGeneric(slug);
  console.warn(
    `[loadSheetSchema] ${reason}; using bundled '${schema.systemSlug}' v${schema.schemaVersion}`,
  );
  return schema;
}

export async function loadSheetSchema(systemSlug: string | null): Promise<SheetSchema> {
  if (!systemSlug) {
    const cached = readCache(GENERIC_SLUG);
    if (cached) return cached;
    const schema = BUNDLED_SCHEMAS[GENERIC_SLUG];
    writeCache(GENERIC_SLUG, schema);
    return schema;
  }

  const cached = readCache(systemSlug);
  if (cached) return cached;

  const system = await prisma.system.findUnique({ where: { slug: systemSlug } });
  if (!system) {
    const schema = warnAndFallback(systemSlug, `system '${systemSlug}' not found in DB`);
    writeCache(systemSlug, schema);
    return schema;
  }

  if (!system.rulesJson) {
    const schema = warnAndFallback(systemSlug, `rulesJson is null for '${systemSlug}'`);
    writeCache(systemSlug, schema);
    return schema;
  }

  let parsed: SheetSchema;
  try {
    parsed = parseSheetSchema(JSON.parse(system.rulesJson));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const schema = warnAndFallback(
      systemSlug,
      `rulesJson invalid for '${systemSlug}': ${message}`,
    );
    writeCache(systemSlug, schema);
    return schema;
  }

  const bundled = BUNDLED_SCHEMAS[systemSlug];
  if (bundled && bundled.schemaVersion > parsed.schemaVersion) {
    const schema = warnAndFallback(
      systemSlug,
      `DB schemaVersion ${parsed.schemaVersion} older than bundled ${bundled.schemaVersion} for '${systemSlug}'`,
    );
    writeCache(systemSlug, schema);
    return schema;
  }

  writeCache(systemSlug, parsed);
  return parsed;
}

export function clearSheetSchemaCache(): void {
  schemaCache.clear();
  latestVersionBySlug.clear();
}
