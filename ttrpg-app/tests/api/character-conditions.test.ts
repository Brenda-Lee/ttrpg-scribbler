import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeCharacter,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import {
  GET,
  POST,
} from "../../app/api/characters/[projectId]/[characterId]/conditions/route";
import {
  PATCH,
  DELETE,
} from "../../app/api/characters/[projectId]/[characterId]/conditions/[conditionId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/characters/[projectId]/[characterId]/conditions", () => {
  it("cria condição com severity padrão LIGHT", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ch = await makeCharacter(project.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { region: "HEAD" }),
      params({ projectId: project.id, characterId: ch.id }),
    );
    expect(res.status).toBe(201);
    const all = await prisma.characterCondition.findMany({ where: { characterId: ch.id } });
    expect(all).toHaveLength(1);
    expect(all[0]!.region).toBe("HEAD");
    expect(all[0]!.severity).toBe("LIGHT");
  });

  it("rejeita region inválido com 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ch = await makeCharacter(project.id);
    const res = await POST(
      jsonRequest("POST", "http://t/", { region: "TAIL" }),
      params({ projectId: project.id, characterId: ch.id }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 404 para personagem de outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const ch = await makeCharacter(project.id);
    const res = await POST(
      jsonRequest("POST", "http://t/", { region: "HEAD" }),
      params({ projectId: project.id, characterId: ch.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/characters/[projectId]/[characterId]/conditions", () => {
  it("lista condições em ordem cronológica ascendente", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ch = await makeCharacter(project.id);
    await prisma.characterCondition.create({
      data: { characterId: ch.id, region: "HEAD", severity: "LIGHT" },
    });
    await prisma.characterCondition.create({
      data: { characterId: ch.id, region: "TORSO_FRONT", severity: "SEVERE" },
    });

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id, characterId: ch.id }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { conditions: Array<{ region: string }> };
    expect(data.conditions).toHaveLength(2);
    expect(data.conditions[0]!.region).toBe("HEAD");
  });
});

describe("PATCH/DELETE /api/characters/[projectId]/[characterId]/conditions/[conditionId]", () => {
  it("atualiza severity e descrição", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ch = await makeCharacter(project.id);
    const cond = await prisma.characterCondition.create({
      data: { characterId: ch.id, region: "HEAD", severity: "LIGHT" },
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        severity: "CRITICAL",
        description: "fratura aberta",
      }),
      params({ projectId: project.id, characterId: ch.id, conditionId: cond.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.characterCondition.findUnique({ where: { id: cond.id } });
    expect(reloaded?.severity).toBe("CRITICAL");
    expect(reloaded?.description).toBe("fratura aberta");
  });

  it("DELETE remove a condição", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ch = await makeCharacter(project.id);
    const cond = await prisma.characterCondition.create({
      data: { characterId: ch.id, region: "LEFT_ARM" },
    });

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, characterId: ch.id, conditionId: cond.id }),
    );
    expect(res.status).toBe(200);
    expect(
      await prisma.characterCondition.findUnique({ where: { id: cond.id } }),
    ).toBeNull();
  });

  it("retorna 404 para condição de outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const ch = await makeCharacter(project.id);
    const cond = await prisma.characterCondition.create({
      data: { characterId: ch.id, region: "HEAD" },
    });
    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { severity: "MODERATE" }),
      params({ projectId: project.id, characterId: ch.id, conditionId: cond.id }),
    );
    expect(res.status).toBe(404);
  });
});
