import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { makeProject, makeTwoUsers, makeUser } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import {
  GET,
  PATCH,
} from "../../app/api/characters/[projectId]/[characterId]/sheet/route";
import {
  clearSheetSchemaCache,
} from "@/lib/sheets/loadSchema";
import { clearZodSchemaCache } from "@/lib/sheets/zodFromSchema";
import { extractDefaults } from "@/lib/sheets/defaults";
import { parseSheetSchema } from "@/lib/sheets/parser";

const TORMENTA_PATH = path.resolve("prisma/sheets/tormenta20.json");

beforeEach(async () => {
  await resetDb();
  clearSheetSchemaCache();
  clearZodSchemaCache();
});

async function makeTormentaSystem() {
  const raw = fs.readFileSync(TORMENTA_PATH, "utf-8");
  return prisma.system.create({
    data: { name: "Tormenta 20", slug: "tormenta20", rulesJson: raw },
  });
}

function tormentaDefaults(): Record<string, unknown> {
  const raw = JSON.parse(fs.readFileSync(TORMENTA_PATH, "utf-8"));
  return extractDefaults(parseSheetSchema(raw));
}

async function makeOwnedCharacterWithSheet() {
  const owner = await makeUser();
  const system = await makeTormentaSystem();
  const project = await makeProject(owner.id, { systemId: system.id });
  const character = await prisma.character.create({
    data: { projectId: project.id, name: "Aria", role: "PC" },
  });
  const sheet = await prisma.characterSheet.create({
    data: {
      characterId: character.id,
      systemSlug: "tormenta20",
      schemaVersion: 1,
      dataJson: JSON.stringify(tormentaDefaults()),
    },
  });
  return { owner, project, character, sheet };
}

describe("GET /api/characters/[projectId]/[characterId]/sheet", () => {
  it("returns the schema, base, effective, breakdown, and conditions", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();
    await prisma.characterCondition.create({
      data: { characterId: character.id, region: "LEFT_LEG", severity: "SEVERE" },
    });

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      schema: { systemSlug: string; sections: { id: string }[] };
      base: Record<string, unknown>;
      effective: Record<string, unknown>;
      breakdown: Record<string, unknown[]>;
      conditions: { id: string; region: string }[];
    };

    expect(body.schema.systemSlug).toBe("tormenta20");
    expect(body.schema.sections.length).toBeGreaterThan(0);
    expect(body.base).toHaveProperty("defesa_base", 10);
    // SEVERE LEFT_LEG preset subtracts 3 from deslocamento (default 9 → 6).
    expect(body.effective.deslocamento).toBe(6);
    // Derived defesa_efetiva = defesa_base + des. With des=0 base → 10.
    expect(body.effective.defesa_efetiva).toBe(10);
    expect(body.breakdown.deslocamento).toHaveLength(1);
    expect(body.conditions).toHaveLength(1);
    expect(body.conditions[0].region).toBe("LEFT_LEG");
  });

  it("returns 404 when the character belongs to another user", async () => {
    const { other } = await makeTwoUsers();
    const system = await makeTormentaSystem();
    const project = await makeProject(other.id, { systemId: system.id });
    const character = await prisma.character.create({
      data: { projectId: project.id, name: "Estranho", role: "NPC" },
    });
    await prisma.characterSheet.create({
      data: {
        characterId: character.id,
        systemSlug: "tormenta20",
        schemaVersion: 1,
        dataJson: JSON.stringify(tormentaDefaults()),
      },
    });

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when the sheet row is missing", async () => {
    const owner = await makeUser();
    const project = await makeProject(owner.id);
    const character = await prisma.character.create({
      data: { projectId: project.id, name: "Sem ficha", role: "NPC" },
    });

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/characters/[projectId]/[characterId]/sheet — legacy backfill", () => {
  it("creates a CharacterSheet on first PATCH for a legacy character that has none", async () => {
    // Cenário: personagem criado antes da task 09 (sem sheet associado).
    // O PATCH precisa criar o registro em vez de 404ar.
    const owner = await makeUser();
    const system = await makeTormentaSystem();
    const project = await makeProject(owner.id, { systemId: system.id });
    const character = await prisma.character.create({
      data: { projectId: project.id, name: "Legacy", role: "PC" },
    });

    // Pré-condição: sem sheet.
    const before = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    expect(before).toBeNull();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        patch: { defesa_base: 14, des: 4 },
      }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(200);

    // Pós-condição: sheet criado com o patch aplicado e defaults nos
    // campos que não estavam no patch.
    const after = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    expect(after).not.toBeNull();
    const stored = JSON.parse(after!.dataJson);
    expect(stored.defesa_base).toBe(14);
    expect(stored.des).toBe(4);
    expect(stored.deslocamento).toBe(9); // default tormenta20
    expect(stored.tamanho).toBe("Médio"); // default tormenta20

    expect(after!.systemSlug).toBe("tormenta20");
    expect(after!.schemaVersion).toBeGreaterThanOrEqual(1);
  });

  it("still returns 404 when the character itself does not exist", async () => {
    const owner = await makeUser();
    const project = await makeProject(owner.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { patch: { for: 10 } }),
      params({ projectId: project.id, characterId: "non-existent-id" }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/characters/[projectId]/[characterId]/sheet", () => {
  it("rejects an unknown top-level key with 400 and Zod issues", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { patch: { totally_unknown: 7 } }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("invalid");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("rejects a type-mismatched value with 400", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { patch: { defesa_base: "not a number" } }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a missing patch envelope with 400", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { not_patch: { defesa_base: 12 } }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(400);
  });

  it("persists a valid partial patch and returns the recomputed effective snapshot", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        patch: { defesa_base: 14, des: 4 },
      }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      base: Record<string, number>;
      effective: Record<string, number>;
    };
    expect(body.base.defesa_base).toBe(14);
    expect(body.base.des).toBe(4);
    // defesa_efetiva = defesa_base + des = 14 + 4 = 18.
    expect(body.effective.defesa_efetiva).toBe(18);

    // Database reflects the merge.
    const sheet = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    const stored = JSON.parse(sheet!.dataJson);
    expect(stored.defesa_base).toBe(14);
    expect(stored.des).toBe(4);
    expect(stored.deslocamento).toBe(9); // unchanged
  });

  it("replaces a repeating-list array wholesale", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        patch: {
          ataques: [
            { nome: "Espada longa", teste: 5, dano: "1d8+2", critico: "19-20", alcance: "corpo a corpo" },
          ],
        },
      }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(200);

    const sheet = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    const stored = JSON.parse(sheet!.dataJson);
    expect(stored.ataques).toHaveLength(1);
    expect(stored.ataques[0].nome).toBe("Espada longa");
  });

  it("GET after PATCH reflects the merged base and derived recompute", async () => {
    const { project, character } = await makeOwnedCharacterWithSheet();

    await PATCH(
      jsonRequest("PATCH", "http://t/", { patch: { defesa_base: 12, des: 3 } }),
      params({ projectId: project.id, characterId: character.id }),
    );

    const getRes = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id, characterId: character.id }),
    );
    const body = (await getRes.json()) as {
      base: Record<string, number>;
      effective: Record<string, number>;
    };
    expect(body.base.defesa_base).toBe(12);
    expect(body.base.des).toBe(3);
    expect(body.effective.defesa_efetiva).toBe(15);
  });

  it("returns 404 for a character not owned by the caller", async () => {
    const { other } = await makeTwoUsers();
    const system = await makeTormentaSystem();
    const project = await makeProject(other.id, { systemId: system.id });
    const character = await prisma.character.create({
      data: { projectId: project.id, name: "Estranho", role: "NPC" },
    });
    await prisma.characterSheet.create({
      data: {
        characterId: character.id,
        systemSlug: "tormenta20",
        schemaVersion: 1,
        dataJson: JSON.stringify(tormentaDefaults()),
      },
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { patch: { defesa_base: 99 } }),
      params({ projectId: project.id, characterId: character.id }),
    );
    expect(res.status).toBe(404);
  });
});
