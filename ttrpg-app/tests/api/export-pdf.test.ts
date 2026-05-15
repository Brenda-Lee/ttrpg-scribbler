import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeTwoUsers } from "../helpers/factories";
import { jsonRequest } from "../helpers/request";
import { POST } from "../../app/api/export/pdf/route";

beforeEach(async () => {
  await resetDb();
  vi.resetModules();
});

describe("POST /api/export/pdf — validation", () => {
  it("retorna 400 para payload sem projectId", async () => {
    await makeUser(); // garante existência de current user para a auth bypass
    const res = await POST(jsonRequest("POST", "http://t/", { kind: "project" }));
    expect(res.status).toBe(400);
  });

  it("retorna 400 para kind inválido", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const res = await POST(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        kind: "bogus",
        id: project.id,
        style: "FORMAL",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 400 para style inválido", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const res = await POST(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        kind: "project",
        id: project.id,
        style: "BOGUS",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 404 para projeto de outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const res = await POST(
      jsonRequest("POST", "http://t/", {
        projectId: project.id,
        kind: "project",
        id: project.id,
        style: "FORMAL",
      }),
    );
    expect(res.status).toBe(404);
  });
});
