import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeAct,
  makeChapter,
  makeScene,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest } from "../helpers/request";
import { prisma } from "@/lib/db";
import { POST as REORDER_ACTS } from "../../app/api/acts/reorder/route";
import { POST as REORDER_CHAPTERS } from "../../app/api/chapters/reorder/route";
import { POST as REORDER_SCENES } from "../../app/api/scenes/reorder/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/acts/reorder", () => {
  it("reordena atos do mesmo projeto", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const a1 = await makeAct(project.id, "A", 0);
    const a2 = await makeAct(project.id, "B", 1);
    const a3 = await makeAct(project.id, "C", 2);

    const res = await REORDER_ACTS(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        items: [
          { id: a3.id, order: 0 },
          { id: a1.id, order: 1 },
          { id: a2.id, order: 2 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const acts = await prisma.act.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    expect(acts.map((a) => a.title)).toEqual(["C", "A", "B"]);
  });

  it("rejeita ato que não pertence ao projeto com 400", async () => {
    const user = await makeUser();
    const p1 = await makeProject(user.id, { title: "P1" });
    const p2 = await makeProject(user.id, { title: "P2" });
    const a1 = await makeAct(p1.id, "A");
    const a2 = await makeAct(p2.id, "X"); // pertence a outro projeto

    const res = await REORDER_ACTS(
      jsonRequest("POST", "http://t/", {
        projectId: p1.id,
        items: [
          { id: a1.id, order: 0 },
          { id: a2.id, order: 1 },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando projeto pertence a outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const res = await REORDER_ACTS(
      jsonRequest("POST", "http://t/", { projectId: project.id, items: [] }),
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/chapters/reorder", () => {
  it("reordena capítulos dentro do mesmo ato", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const c1 = await makeChapter(act.id, "A", 0);
    const c2 = await makeChapter(act.id, "B", 1);

    const res = await REORDER_CHAPTERS(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        items: [
          { id: c2.id, order: 0 },
          { id: c1.id, order: 1 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const chs = await prisma.chapter.findMany({
      where: { actId: act.id },
      orderBy: { order: "asc" },
    });
    expect(chs.map((c) => c.title)).toEqual(["B", "A"]);
  });

  it("move capítulo entre atos quando actId é informado", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const a1 = await makeAct(project.id, "Ato 1", 0);
    const a2 = await makeAct(project.id, "Ato 2", 1);
    const ch = await makeChapter(a1.id, "Vagante");

    const res = await REORDER_CHAPTERS(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        items: [{ id: ch.id, order: 0, actId: a2.id }],
      }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.chapter.findUnique({ where: { id: ch.id } });
    expect(reloaded?.actId).toBe(a2.id);
  });

  it("rejeita reparent para ato de outro projeto", async () => {
    const user = await makeUser();
    const p1 = await makeProject(user.id);
    const p2 = await makeProject(user.id, { title: "Outro" });
    const a1 = await makeAct(p1.id);
    const a2 = await makeAct(p2.id);
    const ch = await makeChapter(a1.id);

    const res = await REORDER_CHAPTERS(
      jsonRequest("POST", "http://t/", {
        projectId: p1.id,
        items: [{ id: ch.id, order: 0, actId: a2.id }],
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/scenes/reorder", () => {
  it("reordena cenas dentro do mesmo capítulo", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const s1 = await makeScene(chapter.id, "A", 0);
    const s2 = await makeScene(chapter.id, "B", 1);

    const res = await REORDER_SCENES(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        items: [
          { id: s2.id, order: 0 },
          { id: s1.id, order: 1 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const scenes = await prisma.scene.findMany({
      where: { chapterId: chapter.id },
      orderBy: { order: "asc" },
    });
    expect(scenes.map((s) => s.title)).toEqual(["B", "A"]);
  });

  it("move cena para outro capítulo quando chapterId é informado", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const c1 = await makeChapter(act.id, "Cap 1");
    const c2 = await makeChapter(act.id, "Cap 2");
    const scene = await makeScene(c1.id);

    const res = await REORDER_SCENES(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        items: [{ id: scene.id, order: 0, chapterId: c2.id }],
      }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(reloaded?.chapterId).toBe(c2.id);
  });
});
