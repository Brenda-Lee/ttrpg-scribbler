import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeCharacter } from "../helpers/factories";
import { prisma } from "@/lib/db";

beforeEach(async () => {
  await resetDb();
});

describe("schema: CharacterSheet 1:1 with Character", () => {
  it("creates Character and CharacterSheet atomically in a transaction", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const [character, sheet] = await prisma.$transaction(async (tx) => {
      const c = await tx.character.create({
        data: { projectId: project.id, name: "Sa'Elis", role: "PC" },
      });
      const s = await tx.characterSheet.create({
        data: {
          characterId: c.id,
          systemSlug: "tormenta20",
          schemaVersion: 1,
          dataJson: JSON.stringify({ for: 14, des: 12 }),
        },
      });
      return [c, s];
    });

    expect(sheet.characterId).toBe(character.id);
    expect(sheet.systemSlug).toBe("tormenta20");

    const reloaded = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    expect(reloaded?.dataJson).toBe(JSON.stringify({ for: 14, des: 12 }));
    expect(reloaded?.schemaVersion).toBe(1);
  });

  it("cascade-deletes CharacterSheet when its Character is deleted", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const character = await makeCharacter(project.id);
    await prisma.characterSheet.create({
      data: {
        characterId: character.id,
        systemSlug: "generic",
        dataJson: "{}",
      },
    });

    await prisma.character.delete({ where: { id: character.id } });

    const orphan = await prisma.characterSheet.findUnique({
      where: { characterId: character.id },
    });
    expect(orphan).toBeNull();
  });

  it("enforces 1:1 by rejecting a second sheet for the same character", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const character = await makeCharacter(project.id);
    await prisma.characterSheet.create({
      data: {
        characterId: character.id,
        systemSlug: "generic",
        dataJson: "{}",
      },
    });

    await expect(
      prisma.characterSheet.create({
        data: {
          characterId: character.id,
          systemSlug: "tormenta20",
          dataJson: "{}",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("schema: CharacterCondition.modifiersJson", () => {
  it("round-trips a JSON string of modifiers", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const character = await makeCharacter(project.id);

    const payload = JSON.stringify([
      { field: "deslocamento", delta: -3, reason: "Perna esquerda severa" },
      { field: "des", delta: -1 },
    ]);

    const created = await prisma.characterCondition.create({
      data: {
        characterId: character.id,
        region: "LEFT_LEG",
        severity: "SEVERE",
        modifiersJson: payload,
      },
    });

    const reloaded = await prisma.characterCondition.findUnique({
      where: { id: created.id },
    });
    expect(reloaded?.modifiersJson).toBe(payload);
  });

  it("defaults modifiersJson to null when omitted on create", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const character = await makeCharacter(project.id);

    const cond = await prisma.characterCondition.create({
      data: {
        characterId: character.id,
        region: "HEAD",
        severity: "LIGHT",
      },
    });
    expect(cond.modifiersJson).toBeNull();
  });

  it("allows clearing modifiersJson by updating to null", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const character = await makeCharacter(project.id);

    const cond = await prisma.characterCondition.create({
      data: {
        characterId: character.id,
        region: "TORSO_FRONT",
        severity: "MODERATE",
        modifiersJson: "[]",
      },
    });

    const updated = await prisma.characterCondition.update({
      where: { id: cond.id },
      data: { modifiersJson: null },
    });
    expect(updated.modifiersJson).toBeNull();
  });
});
