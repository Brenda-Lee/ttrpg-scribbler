import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeAct,
  makeChapter,
  makeCharacter,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { POST } from "../../app/api/characters/[projectId]/route";
import { PATCH, DELETE } from "../../app/api/characters/[projectId]/[characterId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/characters/[projectId]", () => {
  it("creates a character with attributesJson stringified and an attached sheet", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        name: "Sa'Elis",
        role: "PC",
        bio: "Maga errante.",
        attributesJson: { classe: "Maga", nivel: 3 },
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string; name: string };
    expect(created.name).toBe("Sa'Elis");

    const reloaded = await prisma.character.findUnique({
      where: { id: created.id },
      include: { sheet: true },
    });
    expect(reloaded?.role).toBe("PC");
    expect(reloaded?.bio).toBe("Maga errante.");
    expect(typeof reloaded?.attributesJson).toBe("string");
    expect(JSON.parse(reloaded!.attributesJson!)).toEqual({ classe: "Maga", nivel: 3 });

    // Sheet was created atomically alongside the character.
    expect(reloaded?.sheet).not.toBeNull();
    expect(reloaded?.sheet?.systemSlug).toBe("generic");
    expect(reloaded?.sheet?.schemaVersion).toBeGreaterThanOrEqual(1);
    const data = JSON.parse(reloaded!.sheet!.dataJson);
    expect(typeof data).toBe("object");
    expect(Array.isArray(data)).toBe(false);
  });

  it("defaults role to NPC when omitted", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "Jorek" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const c = (await res.json()) as { role: string };
    expect(c.role).toBe("NPC");
  });

  it("rejects empty name with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid role with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "x", role: "BOSS" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when project belongs to another user", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "x" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/characters/[projectId]/[characterId]", () => {
  it("updates name and role", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const char = await makeCharacter(project.id, "Antigo", "NPC");

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { name: "Novo Nome", role: "VILLAIN" }),
      params({ projectId: project.id, characterId: char.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.character.findUnique({ where: { id: char.id } });
    expect(reloaded?.name).toBe("Novo Nome");
    expect(reloaded?.role).toBe("VILLAIN");
  });

  it("returns 404 for another user's character", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const char = await makeCharacter(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { name: "Hack" }),
      params({ projectId: project.id, characterId: char.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/characters/[projectId]/[characterId]", () => {
  it("removes character and cascades ChapterCharacter", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const char = await makeCharacter(project.id);
    await prisma.chapterCharacter.create({
      data: { chapterId: chapter.id, characterId: char.id },
    });

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, characterId: char.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.character.findUnique({ where: { id: char.id } })).toBeNull();
    expect(
      await prisma.chapterCharacter.findMany({ where: { characterId: char.id } }),
    ).toHaveLength(0);
  });
});
