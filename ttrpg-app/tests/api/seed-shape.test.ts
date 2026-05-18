import { execSync } from "node:child_process";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { parseSheetSchema } from "@/lib/sheets/parser";

const SEED_PATH = path.resolve("prisma/seed.ts");
const DB_URL = `file:${path.resolve("prisma/test.db")}`;

function runSeed(args: string[] = []): void {
  execSync(`npx tsx ${SEED_PATH} ${args.join(" ")}`.trim(), {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: DB_URL },
  });
}

describe("seed shape (integration)", () => {
  beforeAll(async () => {
    await resetDb();
    // Fresh DB: first run --reset is a no-op guard; the seed clears before
    // inserting, so a plain run is enough.
    runSeed();
  });

  it("populates System.rulesJson with a Zod-valid schema for both seeded systems", async () => {
    const systems = await prisma.system.findMany();
    expect(systems).toHaveLength(2);

    for (const system of systems) {
      expect(system.rulesJson).toBeTruthy();
      const parsed = parseSheetSchema(JSON.parse(system.rulesJson!));
      expect(parsed.systemSlug).toBe(system.slug);
      expect(parsed.schemaVersion).toBeGreaterThanOrEqual(1);
    }
  });

  it("creates exactly one CharacterSheet per demo character", async () => {
    const characters = await prisma.character.findMany({
      include: { sheet: true },
    });

    expect(characters.length).toBeGreaterThan(0);
    for (const character of characters) {
      expect(character.sheet).not.toBeNull();
    }

    const sheetCount = await prisma.characterSheet.count();
    expect(sheetCount).toBe(characters.length);
  });

  it("CharacterSheet.systemSlug matches the parent project's system slug", async () => {
    const characters = await prisma.character.findMany({
      include: { sheet: true, project: { include: { system: true } } },
    });

    for (const character of characters) {
      expect(character.sheet).not.toBeNull();
      const expectedSlug = character.project.system?.slug ?? "generic";
      expect(character.sheet!.systemSlug).toBe(expectedSlug);
    }
  });

  it("CharacterSheet.dataJson parses as a JSON object", async () => {
    const sheets = await prisma.characterSheet.findMany();
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) {
      const parsed = JSON.parse(sheet.dataJson);
      expect(typeof parsed).toBe("object");
      expect(Array.isArray(parsed)).toBe(false);
      expect(parsed).not.toBeNull();
    }
  });

  it("re-running the seed without --reset does not create a second sheet", async () => {
    const before = await prisma.characterSheet.count();

    runSeed();

    const after = await prisma.characterSheet.count();
    expect(after).toBe(before);
  });

  it("re-running with --reset replaces the data but keeps a 1:1 sheet count", async () => {
    runSeed(["--reset"]);

    const characters = await prisma.character.count();
    const sheets = await prisma.characterSheet.count();
    expect(sheets).toBe(characters);
    expect(sheets).toBeGreaterThan(0);
  });
});
