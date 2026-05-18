import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import {
  clearSheetSchemaCache,
  loadSheetSchema,
} from "@/lib/sheets/loadSchema";
import { BUNDLED_SCHEMAS } from "@/lib/sheets/bundled";
import type { SheetSchema } from "@/lib/sheets/types";

beforeEach(async () => {
  await resetDb();
  clearSheetSchemaCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSheetSchema", () => {
  it("returns the bundled generic schema when systemSlug is null", async () => {
    const findUnique = vi.spyOn(prisma.system, "findUnique");
    const schema = await loadSheetSchema(null);

    expect(schema.systemSlug).toBe("generic");
    expect(schema.schemaVersion).toBe(1);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("hits the cache on the second call for the same slug and skips Prisma", async () => {
    await prisma.system.create({
      data: { name: "Tormenta 20", slug: "tormenta20" },
    });

    // First call populates the cache (uses fallback because rulesJson is null).
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await loadSheetSchema("tormenta20");
    warn.mockRestore();

    const findUnique = vi.spyOn(prisma.system, "findUnique");
    const schema = await loadSheetSchema("tormenta20");

    expect(findUnique).not.toHaveBeenCalled();
    expect(schema.systemSlug).toBe("tormenta20");
  });

  it("warns and falls back to bundled when the system is missing from the DB", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const schema = await loadSheetSchema("dnd-5e");

    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/not found/);
    expect(schema.systemSlug).toBe("dnd-5e");
  });

  it("warns and falls back when rulesJson is null", async () => {
    await prisma.system.create({
      data: { name: "Tormenta 20", slug: "tormenta20", rulesJson: null },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const schema = await loadSheetSchema("tormenta20");

    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/null/);
    expect(schema.systemSlug).toBe("tormenta20");
    expect(schema).toBe(BUNDLED_SCHEMAS.tormenta20);
  });

  it("warns and falls back when rulesJson is malformed JSON", async () => {
    await prisma.system.create({
      data: {
        name: "Tormenta 20",
        slug: "tormenta20",
        rulesJson: "{ this is not json",
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const schema = await loadSheetSchema("tormenta20");

    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/invalid/);
    expect(schema.systemSlug).toBe("tormenta20");
  });

  it("warns and falls back when rulesJson fails Zod validation", async () => {
    const invalid = JSON.stringify({
      systemSlug: "tormenta20",
      schemaVersion: 1,
      sections: [], // schema requires at least one section
      injuryPresets: [],
    });
    await prisma.system.create({
      data: { name: "Tormenta 20", slug: "tormenta20", rulesJson: invalid },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const schema = await loadSheetSchema("tormenta20");

    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toMatch(/invalid/);
    expect(schema.systemSlug).toBe("tormenta20");
  });

  it("warns and falls back when DB schemaVersion is older than bundled", async () => {
    const originalTormenta = BUNDLED_SCHEMAS.tormenta20;
    const bumped: SheetSchema = { ...originalTormenta, schemaVersion: 99 };
    BUNDLED_SCHEMAS.tormenta20 = bumped;
    try {
      const dbSchema = {
        systemSlug: "tormenta20",
        schemaVersion: 1,
        sections: [
          {
            id: "marker",
            title: "OLDER_DB",
            fields: [{ id: "x", type: "text" }],
          },
        ],
        injuryPresets: [],
      };
      await prisma.system.create({
        data: {
          name: "Tormenta 20",
          slug: "tormenta20",
          rulesJson: JSON.stringify(dbSchema),
        },
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const schema = await loadSheetSchema("tormenta20");

      expect(warn).toHaveBeenCalled();
      expect(warn.mock.calls[0][0]).toMatch(/older/);
      // Should be the bumped bundled schema, not the DB one
      expect(schema.schemaVersion).toBe(99);
      expect(schema.sections[0].title).not.toBe("OLDER_DB");
    } finally {
      BUNDLED_SCHEMAS.tormenta20 = originalTormenta;
    }
  });

  it("clearSheetSchemaCache resets the cache between calls", async () => {
    await prisma.system.create({
      data: { name: "Tormenta 20", slug: "tormenta20" },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await loadSheetSchema("tormenta20");
    clearSheetSchemaCache();

    const findUnique = vi.spyOn(prisma.system, "findUnique");
    await loadSheetSchema("tormenta20");

    expect(findUnique).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
