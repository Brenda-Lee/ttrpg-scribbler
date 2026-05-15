import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeAct,
  makeChapter,
  makeScene,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { PATCH, DELETE } from "../../app/api/scenes/[sceneId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("PATCH /api/scenes/[sceneId]", () => {
  it("updates title, status, contentText and wordCount", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        title: "Cena 1 — Bruma",
        status: "REVISING",
        contentText: "Texto plano",
        wordCount: 2,
      }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(reloaded?.title).toBe("Cena 1 — Bruma");
    expect(reloaded?.status).toBe("REVISING");
    expect(reloaded?.contentText).toBe("Texto plano");
    expect(reloaded?.wordCount).toBe(2);
  });

  it("stringifies contentJson when persisting", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { contentJson: doc }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(typeof reloaded?.contentJson).toBe("string");
    expect(JSON.parse(reloaded!.contentJson)).toEqual(doc);
  });

  it("rejects invalid status with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { status: "BOGUS" }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects negative wordCount with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { wordCount: -1 }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's scene (deep ownership)", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/scenes/[sceneId]", () => {
  it("removes only the scene, not the chapter", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.scene.findUnique({ where: { id: scene.id } })).toBeNull();
    expect(await prisma.chapter.findUnique({ where: { id: chapter.id } })).not.toBeNull();
  });
});
