import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeAct,
  makeChapter,
  makeScene,
  makeCharacter,
  makeTag,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { PATCH, DELETE } from "../../app/api/chapters/[chapterId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("PATCH /api/chapters/[chapterId]", () => {
  it("updates title and summary", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id, "Antigo");

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        title: "Cap. 1 — Atracando",
        summary: "Chegada ao porto.",
      }),
      params({ chapterId: chapter.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.chapter.findUnique({ where: { id: chapter.id } });
    expect(reloaded?.title).toBe("Cap. 1 — Atracando");
    expect(reloaded?.summary).toBe("Chegada ao porto.");
  });

  it("syncs characterIds (add/remove)", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const c1 = await makeCharacter(project.id, "Sa'Elis");
    const c2 = await makeCharacter(project.id, "Jorek");

    // adiciona ambos
    await PATCH(
      jsonRequest("PATCH", "http://t/", { characterIds: [c1.id, c2.id] }),
      params({ chapterId: chapter.id }),
    );
    let links = await prisma.chapterCharacter.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(2);

    // remove um
    await PATCH(
      jsonRequest("PATCH", "http://t/", { characterIds: [c2.id] }),
      params({ chapterId: chapter.id }),
    );
    links = await prisma.chapterCharacter.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(1);
    expect(links[0].characterId).toBe(c2.id);

    // limpa tudo
    await PATCH(
      jsonRequest("PATCH", "http://t/", { characterIds: [] }),
      params({ chapterId: chapter.id }),
    );
    links = await prisma.chapterCharacter.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(0);
  });

  it("ignores characterIds from other projects", async () => {
    const user = await makeUser();
    const projectA = await makeProject(user.id);
    const projectB = await makeProject(user.id, { title: "B" });
    const act = await makeAct(projectA.id);
    const chapter = await makeChapter(act.id);
    const ownChar = await makeCharacter(projectA.id);
    const foreignChar = await makeCharacter(projectB.id, "Outro");

    await PATCH(
      jsonRequest("PATCH", "http://t/", { characterIds: [ownChar.id, foreignChar.id] }),
      params({ chapterId: chapter.id }),
    );
    const links = await prisma.chapterCharacter.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(1);
    expect(links[0].characterId).toBe(ownChar.id);
  });

  it("upserts tagNames: creates missing and reuses existing", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const existing = await makeTag(project.id, "suspense");

    await PATCH(
      jsonRequest("PATCH", "http://t/", { tagNames: ["suspense", "política"] }),
      params({ chapterId: chapter.id }),
    );

    const tags = await prisma.tag.findMany({ where: { projectId: project.id } });
    expect(tags).toHaveLength(2);
    const existingStill = tags.find((t) => t.id === existing.id);
    expect(existingStill?.name).toBe("suspense");
    expect(tags.some((t) => t.name === "política")).toBe(true);

    const links = await prisma.chapterTag.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(2);
  });

  it("clears all ChapterTag when tagNames: []", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const tag = await makeTag(project.id, "suspense");
    await prisma.chapterTag.create({ data: { chapterId: chapter.id, tagId: tag.id } });

    await PATCH(
      jsonRequest("PATCH", "http://t/", { tagNames: [] }),
      params({ chapterId: chapter.id }),
    );
    const links = await prisma.chapterTag.findMany({ where: { chapterId: chapter.id } });
    expect(links).toHaveLength(0);
  });

  it("returns 404 for another user's chapter", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ chapterId: chapter.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/chapters/[chapterId]", () => {
  it("cascades to scenes, ChapterTag and ChapterCharacter", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);
    const character = await makeCharacter(project.id);
    const tag = await makeTag(project.id);
    await prisma.chapterCharacter.create({
      data: { chapterId: chapter.id, characterId: character.id },
    });
    await prisma.chapterTag.create({ data: { chapterId: chapter.id, tagId: tag.id } });

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ chapterId: chapter.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.chapter.findUnique({ where: { id: chapter.id } })).toBeNull();
    expect(await prisma.scene.findUnique({ where: { id: scene.id } })).toBeNull();
    expect(await prisma.chapterCharacter.findMany({ where: { chapterId: chapter.id } })).toHaveLength(0);
    expect(await prisma.chapterTag.findMany({ where: { chapterId: chapter.id } })).toHaveLength(0);
    // character e tag continuam no banco
    expect(await prisma.character.findUnique({ where: { id: character.id } })).not.toBeNull();
    expect(await prisma.tag.findUnique({ where: { id: tag.id } })).not.toBeNull();
  });
});
