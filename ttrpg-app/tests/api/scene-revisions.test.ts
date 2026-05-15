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
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { GET, POST } from "../../app/api/scenes/[sceneId]/revisions/route";
import { DELETE as DELETE_REV } from "../../app/api/scenes/[sceneId]/revisions/[revisionId]/route";
import { POST as RESTORE } from "../../app/api/scenes/[sceneId]/revisions/[revisionId]/restore/route";

beforeEach(async () => {
  await resetDb();
});

async function setupScene() {
  const user = await makeUser();
  const project = await makeProject(user.id);
  const act = await makeAct(project.id);
  const chapter = await makeChapter(act.id);
  const scene = await makeScene(chapter.id);
  return { user, project, scene };
}

describe("GET /api/scenes/[sceneId]/revisions", () => {
  it("lista revisões em ordem cronológica reversa", async () => {
    const { scene } = await setupScene();
    for (let i = 0; i < 3; i++) {
      await prisma.sceneRevision.create({
        data: {
          sceneId: scene.id,
          contentJson: '{"type":"doc"}',
          contentText: "",
          wordCount: i,
          kind: "AUTO",
          createdAt: new Date(2026, 0, 1, 12, i),
        },
      });
    }

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { revisions: Array<{ wordCount: number }> };
    expect(data.revisions).toHaveLength(3);
    expect(data.revisions[0]!.wordCount).toBe(2); // mais recente primeiro
    expect(data.revisions[2]!.wordCount).toBe(0);
  });

  it("retorna 404 para cena de outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/scenes/[sceneId]/revisions", () => {
  it("cria revisão MANUAL capturando conteúdo atual da cena", async () => {
    const { scene } = await setupScene();
    await prisma.scene.update({
      where: { id: scene.id },
      data: { contentJson: '{"foo":1}', contentText: "olá", wordCount: 1 },
    });

    const res = await POST(
      jsonRequest("POST", "http://t/", { label: "checkpoint" }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(201);
    const stored = await prisma.sceneRevision.findFirst({
      where: { sceneId: scene.id, kind: "MANUAL" },
    });
    expect(stored?.label).toBe("checkpoint");
    expect(stored?.contentJson).toBe('{"foo":1}');
    expect(stored?.wordCount).toBe(1);
  });

  it("aceita ausência de label", async () => {
    const { scene } = await setupScene();
    const res = await POST(
      jsonRequest("POST", "http://t/", {}),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(201);
    const stored = await prisma.sceneRevision.findFirst({
      where: { sceneId: scene.id, kind: "MANUAL" },
    });
    expect(stored?.label).toBeNull();
  });

  it("rejeita label gigante com 400", async () => {
    const { scene } = await setupScene();
    const res = await POST(
      jsonRequest("POST", "http://t/", { label: "x".repeat(200) }),
      params({ sceneId: scene.id }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/scenes/[sceneId]/revisions/[revisionId]", () => {
  it("remove a revisão específica", async () => {
    const { scene } = await setupScene();
    const rev = await prisma.sceneRevision.create({
      data: {
        sceneId: scene.id,
        contentJson: "{}",
        contentText: "",
        wordCount: 0,
        kind: "AUTO",
      },
    });
    const res = await DELETE_REV(
      jsonRequest("DELETE", "http://t/"),
      params({ sceneId: scene.id, revisionId: rev.id }),
    );
    expect(res.status).toBe(200);
    const remaining = await prisma.sceneRevision.findUnique({ where: { id: rev.id } });
    expect(remaining).toBeNull();
  });
});

describe("POST /api/scenes/[sceneId]/revisions/[revisionId]/restore", () => {
  it("substitui contentJson da cena e cria revisão MANUAL com conteúdo anterior", async () => {
    const { scene } = await setupScene();
    // estado anterior salvo como revisão
    const rev = await prisma.sceneRevision.create({
      data: {
        sceneId: scene.id,
        contentJson: '{"version":"OLD"}',
        contentText: "antigo",
        wordCount: 1,
        kind: "MANUAL",
        label: "v1",
      },
    });
    // estado atual diferente
    await prisma.scene.update({
      where: { id: scene.id },
      data: {
        contentJson: '{"version":"NEW"}',
        contentText: "novo",
        wordCount: 99,
      },
    });

    const res = await RESTORE(
      jsonRequest("POST", "http://t/"),
      params({ sceneId: scene.id, revisionId: rev.id }),
    );
    expect(res.status).toBe(200);

    const reloaded = await prisma.scene.findUnique({ where: { id: scene.id } });
    expect(reloaded?.contentJson).toBe('{"version":"OLD"}');
    expect(reloaded?.contentText).toBe("antigo");
    expect(reloaded?.wordCount).toBe(1);

    // Deve ter sido criada uma nova revisão MANUAL capturando o estado anterior à restauração.
    const manuals = await prisma.sceneRevision.findMany({
      where: { sceneId: scene.id, kind: "MANUAL" },
      orderBy: { createdAt: "desc" },
    });
    expect(manuals).toHaveLength(2);
    expect(manuals[0]!.label).toMatch(/^Antes de restaurar/);
    expect(manuals[0]!.contentJson).toBe('{"version":"NEW"}');
  });

  it("retorna 404 quando a revisão pertence a outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);
    const rev = await prisma.sceneRevision.create({
      data: {
        sceneId: scene.id,
        contentJson: "{}",
        contentText: "",
        wordCount: 0,
        kind: "AUTO",
      },
    });
    const res = await RESTORE(
      jsonRequest("POST", "http://t/"),
      params({ sceneId: scene.id, revisionId: rev.id }),
    );
    expect(res.status).toBe(404);
  });
});
