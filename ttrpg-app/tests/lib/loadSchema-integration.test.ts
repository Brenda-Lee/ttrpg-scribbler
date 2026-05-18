import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import {
  clearSheetSchemaCache,
  loadSheetSchema,
} from "@/lib/sheets/loadSchema";

beforeEach(async () => {
  await resetDb();
  clearSheetSchemaCache();
});

describe("loadSheetSchema (integration)", () => {
  it("returns the DB version when rulesJson is valid and version is not older than bundled", async () => {
    const dbSchema = {
      systemSlug: "tormenta20",
      schemaVersion: 1,
      sections: [
        {
          id: "marker",
          title: "FROM_DB",
          fields: [{ id: "marker_field", type: "text" }],
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

    const schema = await loadSheetSchema("tormenta20");

    expect(schema.sections[0].title).toBe("FROM_DB");
    expect(schema.sections[0].fields[0].id).toBe("marker_field");
  });

  it("returns the DB version when DB schemaVersion equals bundled version", async () => {
    const dbSchema = {
      systemSlug: "dnd-5e",
      schemaVersion: 1,
      sections: [
        {
          id: "single",
          title: "single",
          fields: [{ id: "any", type: "text" }],
        },
      ],
      injuryPresets: [],
    };
    await prisma.system.create({
      data: {
        name: "D&D 5e",
        slug: "dnd-5e",
        rulesJson: JSON.stringify(dbSchema),
      },
    });

    const schema = await loadSheetSchema("dnd-5e");

    expect(schema.sections).toHaveLength(1);
    expect(schema.sections[0].id).toBe("single");
  });
});
