import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeAct, makeChapter, makeScene, makeTwoUsers } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { PATCH, DELETE } from "../../app/api/projects/[projectId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("PATCH /api/projects/[projectId]", () => {
  it("updates title, summary, and status", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id, { title: "Antigo" });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        title: "Novo Título",
        summary: "Resumo novo",
        status: "ARCHIVED",
      }),
      params({ projectId: project.id }),
    );

    expect(res.status).toBe(200);
    const reloaded = await prisma.project.findUnique({ where: { id: project.id } });
    expect(reloaded?.title).toBe("Novo Título");
    expect(reloaded?.summary).toBe("Resumo novo");
    expect(reloaded?.status).toBe("ARCHIVED");
  });

  it("rejects invalid status with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { status: "BOGUS" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects empty title with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when project belongs to another user", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for nonexistent projectId", async () => {
    await makeUser();
    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Foo" }),
      params({ projectId: "nonexistent" }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/projects/[projectId]", () => {
  it("deletes project and cascades to acts/chapters/scenes", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);

    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    expect(await prisma.act.findUnique({ where: { id: act.id } })).toBeNull();
    expect(await prisma.chapter.findUnique({ where: { id: chapter.id } })).toBeNull();
    expect(await prisma.scene.findUnique({ where: { id: scene.id } })).toBeNull();
  });

  it("returns 404 for another user's project", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
    // permanece no banco
    expect(await prisma.project.findUnique({ where: { id: project.id } })).not.toBeNull();
  });
});
