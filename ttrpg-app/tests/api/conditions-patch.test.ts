import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { makeCharacter, makeProject, makeUser } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { PATCH } from "../../app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route";

beforeEach(async () => {
  await resetDb();
});

async function seedCondition(initial?: {
  modifiersJson?: string | null;
  description?: string | null;
}) {
  const user = await makeUser();
  const project = await makeProject(user.id);
  const character = await makeCharacter(project.id);
  const condition = await prisma.characterCondition.create({
    data: {
      characterId: character.id,
      region: "LEFT_LEG",
      severity: "SEVERE",
      description: initial?.description ?? "Fratura exposta",
      modifiersJson: initial?.modifiersJson ?? null,
    },
  });
  return { project, character, condition };
}

describe("PATCH conditions/[conditionId] — modifiersJson round-trip", () => {
  it("accepts a valid modifiersJson array and persists the stringified payload", async () => {
    const { project, character, condition } = await seedCondition();

    const payload = [
      { field: "deslocamento", delta: -3, reason: "Mancando" },
      { field: "des", delta: -1 },
    ];

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { modifiersJson: payload }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(200);

    const reloaded = await prisma.characterCondition.findUnique({
      where: { id: condition.id },
    });
    expect(typeof reloaded?.modifiersJson).toBe("string");
    expect(JSON.parse(reloaded!.modifiersJson!)).toEqual(payload);
  });

  it("rejects a modifiersJson entry missing `field` with 400", async () => {
    const { project, character, condition } = await seedCondition();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        modifiersJson: [{ delta: -1, reason: "sem field" }],
      }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a modifiersJson entry missing `delta` with 400", async () => {
    const { project, character, condition } = await seedCondition();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        modifiersJson: [{ field: "for" }],
      }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an entry where `field` is empty with 400", async () => {
    const { project, character, condition } = await seedCondition();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        modifiersJson: [{ field: "", delta: -1 }],
      }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an unknown key inside a modifier entry (strict)", async () => {
    const { project, character, condition } = await seedCondition();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        modifiersJson: [{ field: "des", delta: -1, extra: 99 }],
      }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts modifiersJson: null and clears the column", async () => {
    const initial = JSON.stringify([{ field: "des", delta: -1 }]);
    const { project, character, condition } = await seedCondition({
      modifiersJson: initial,
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { modifiersJson: null }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(200);

    const reloaded = await prisma.characterCondition.findUnique({
      where: { id: condition.id },
    });
    expect(reloaded?.modifiersJson).toBeNull();
  });

  it("leaves region/severity/description unchanged when only modifiersJson is sent", async () => {
    const { project, character, condition } = await seedCondition();

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        modifiersJson: [{ field: "deslocamento", delta: -3 }],
      }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(200);

    const reloaded = await prisma.characterCondition.findUnique({
      where: { id: condition.id },
    });
    expect(reloaded?.region).toBe(condition.region);
    expect(reloaded?.severity).toBe(condition.severity);
    expect(reloaded?.description).toBe(condition.description);
  });

  it("leaves modifiersJson unchanged when only region/severity is patched", async () => {
    const stored = JSON.stringify([{ field: "des", delta: -2 }]);
    const { project, character, condition } = await seedCondition({
      modifiersJson: stored,
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { severity: "CRITICAL" }),
      params({
        projectId: project.id,
        characterId: character.id,
        conditionId: condition.id,
      }),
    );
    expect(res.status).toBe(200);

    const reloaded = await prisma.characterCondition.findUnique({
      where: { id: condition.id },
    });
    expect(reloaded?.severity).toBe("CRITICAL");
    expect(reloaded?.modifiersJson).toBe(stored);
  });
});
