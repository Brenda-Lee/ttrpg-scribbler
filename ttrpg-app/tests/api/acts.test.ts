import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeAct, makeChapter, makeScene, makeTwoUsers } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { PATCH, DELETE } from "../../app/api/acts/[actId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("PATCH /api/acts/[actId]", () => {
  it("renames the act", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id, "Antigo");

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Novo Ato" }),
      params({ actId: act.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.act.findUnique({ where: { id: act.id } });
    expect(reloaded?.title).toBe("Novo Ato");
  });

  it("rejects empty title with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "" }),
      params({ actId: act.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's act", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ actId: act.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/acts/[actId]", () => {
  it("cascades to chapters and scenes", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ actId: act.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.act.findUnique({ where: { id: act.id } })).toBeNull();
    expect(await prisma.chapter.findUnique({ where: { id: chapter.id } })).toBeNull();
    expect(await prisma.scene.findUnique({ where: { id: scene.id } })).toBeNull();
  });

  it("returns 404 for another user's act", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ actId: act.id }),
    );
    expect(res.status).toBe(404);
    expect(await prisma.act.findUnique({ where: { id: act.id } })).not.toBeNull();
  });
});
