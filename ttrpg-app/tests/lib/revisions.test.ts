import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeAct,
  makeChapter,
  makeScene,
} from "../helpers/factories";
import { prisma } from "@/lib/db";
import {
  AUTO_RETENTION,
  maybeCreateAutoRevision,
  pruneRevisions,
  shouldCreateAutoRevision,
} from "@/lib/revisions";

beforeEach(async () => {
  await resetDb();
});

describe("shouldCreateAutoRevision", () => {
  it("cria revisão se não há revisão anterior", () => {
    expect(
      shouldCreateAutoRevision({
        now: Date.now(),
        lastAuto: null,
        currentWordCount: 100,
      }),
    ).toBe(true);
  });

  it("cria revisão se a janela de tempo passou", () => {
    expect(
      shouldCreateAutoRevision({
        now: 10_000_000,
        lastAuto: { createdAt: new Date(9_000_000), wordCount: 100 },
        currentWordCount: 105,
        minGapMs: 60_000, // 60s
      }),
    ).toBe(true);
  });

  it("não cria revisão se a janela ainda não passou e a diff de palavras é pequena", () => {
    expect(
      shouldCreateAutoRevision({
        now: 10_000_000,
        lastAuto: { createdAt: new Date(9_999_000), wordCount: 100 },
        currentWordCount: 101,
        minGapMs: 60_000,
        minWordDiff: 50,
      }),
    ).toBe(false);
  });

  it("cria revisão se a diff de palavras ultrapassa o limiar mesmo dentro da janela", () => {
    expect(
      shouldCreateAutoRevision({
        now: 10_000_000,
        lastAuto: { createdAt: new Date(9_999_000), wordCount: 100 },
        currentWordCount: 160,
        minGapMs: 60_000,
        minWordDiff: 50,
      }),
    ).toBe(true);
  });
});

describe("pruneRevisions", () => {
  it("retorna lista vazia quando não excede o retention", () => {
    const revs = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      kind: "AUTO" as const,
      createdAt: new Date(2026, 0, 1, 12, i),
    }));
    expect(pruneRevisions(revs, 20)).toEqual([]);
  });

  it("preserva todas as MANUAL e remove apenas AUTO excedentes", () => {
    const revs = [
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `auto-${i}`,
        kind: "AUTO" as const,
        createdAt: new Date(2026, 0, 1, 12, i),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `manual-${i}`,
        kind: "MANUAL" as const,
        createdAt: new Date(2026, 0, 1, 13, i),
      })),
    ];
    const toDelete = pruneRevisions(revs, 20);
    expect(toDelete).toHaveLength(5);
    // Deve remover os 5 AUTO mais antigos (auto-0..auto-4)
    expect(toDelete.every((id) => id.startsWith("auto-"))).toBe(true);
    expect(toDelete).toEqual(["auto-4", "auto-3", "auto-2", "auto-1", "auto-0"]);
  });

  it("AUTO_RETENTION é 20 por padrão", () => {
    expect(AUTO_RETENTION).toBe(20);
  });
});

describe("maybeCreateAutoRevision", () => {
  async function setup() {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const act = await makeAct(project.id);
    const chapter = await makeChapter(act.id);
    const scene = await makeScene(chapter.id);
    return { sceneId: scene.id };
  }

  it("cria a primeira revisão AUTO quando não há histórico", async () => {
    const { sceneId } = await setup();
    const result = await maybeCreateAutoRevision({
      sceneId,
      contentJson: '{"type":"doc"}',
      contentText: "abc",
      wordCount: 10,
    });
    expect(result.created).toBe(true);
    const revs = await prisma.sceneRevision.findMany({ where: { sceneId } });
    expect(revs).toHaveLength(1);
    expect(revs[0]!.kind).toBe("AUTO");
  });

  it("não cria nova revisão se a última é muito recente e a diff é pequena", async () => {
    const { sceneId } = await setup();
    await prisma.sceneRevision.create({
      data: {
        sceneId,
        contentJson: '{"type":"doc"}',
        contentText: "a",
        wordCount: 10,
        kind: "AUTO",
      },
    });
    const result = await maybeCreateAutoRevision({
      sceneId,
      contentJson: '{"type":"doc"}',
      contentText: "a",
      wordCount: 11,
    });
    expect(result.created).toBe(false);
    const revs = await prisma.sceneRevision.findMany({ where: { sceneId } });
    expect(revs).toHaveLength(1);
  });

  it("aplica pruning quando ultrapassa AUTO_RETENTION", async () => {
    const { sceneId } = await setup();
    // Cria AUTO_RETENTION + 5 revisões AUTO antigas, todas fora da janela de tempo.
    const baseDate = new Date(Date.now() - 60 * 60 * 1000); // 1h atrás
    for (let i = 0; i < AUTO_RETENTION + 5; i++) {
      await prisma.sceneRevision.create({
        data: {
          sceneId,
          contentJson: '{"type":"doc"}',
          contentText: "x",
          wordCount: i,
          kind: "AUTO",
          createdAt: new Date(baseDate.getTime() + i * 1000),
        },
      });
    }
    // Nova edição grande deve disparar criação e pruning.
    const result = await maybeCreateAutoRevision({
      sceneId,
      contentJson: '{"type":"doc"}',
      contentText: "novo",
      wordCount: 9999,
    });
    expect(result.created).toBe(true);
    const remaining = await prisma.sceneRevision.findMany({
      where: { sceneId, kind: "AUTO" },
    });
    expect(remaining).toHaveLength(AUTO_RETENTION);
  });

  it("nunca remove revisões MANUAL durante pruning", async () => {
    const { sceneId } = await setup();
    // 3 MANUAL antigas + 25 AUTO
    const baseDate = new Date(Date.now() - 60 * 60 * 1000);
    for (let i = 0; i < 3; i++) {
      await prisma.sceneRevision.create({
        data: {
          sceneId,
          contentJson: '{"type":"doc"}',
          contentText: "",
          wordCount: 0,
          kind: "MANUAL",
          label: `Manual ${i}`,
          createdAt: new Date(baseDate.getTime() + i * 1000),
        },
      });
    }
    for (let i = 0; i < AUTO_RETENTION + 4; i++) {
      await prisma.sceneRevision.create({
        data: {
          sceneId,
          contentJson: '{"type":"doc"}',
          contentText: "",
          wordCount: i,
          kind: "AUTO",
          createdAt: new Date(baseDate.getTime() + 10_000 + i * 1000),
        },
      });
    }
    await maybeCreateAutoRevision({
      sceneId,
      contentJson: '{"type":"doc"}',
      contentText: "novo",
      wordCount: 5000,
    });
    const remainingManual = await prisma.sceneRevision.count({
      where: { sceneId, kind: "MANUAL" },
    });
    expect(remainingManual).toBe(3);
    const remainingAuto = await prisma.sceneRevision.count({
      where: { sceneId, kind: "AUTO" },
    });
    expect(remainingAuto).toBe(AUTO_RETENTION);
  });
});
