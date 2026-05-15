import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeLocation,
  makeItem,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { POST } from "../../app/api/world/[projectId]/route";
import { PATCH, DELETE } from "../../app/api/world/[projectId]/[kind]/[id]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/world/[projectId]", () => {
  it("creates a location via discriminated union", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        kind: "location",
        name: "Porto de Ferrania",
        description: "Doca principal.",
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string; name: string };
    expect(created.name).toBe("Porto de Ferrania");
    const reloaded = await prisma.location.findUnique({ where: { id: created.id } });
    expect(reloaded?.description).toBe("Doca principal.");
  });

  it("creates an item via discriminated union", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        kind: "item",
        name: "Espelho de Anethel",
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string; name: string };
    expect(created.name).toBe("Espelho de Anethel");
    expect(await prisma.item.findUnique({ where: { id: created.id } })).not.toBeNull();
  });

  it("rejects invalid kind with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { kind: "weapon", name: "Espada" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's project", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { kind: "item", name: "x" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/world/[projectId]/[kind]/[id]", () => {
  it("updates location with valid parentId", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const parent = await makeLocation(project.id, "Valoran");
    const child = await makeLocation(project.id, "Porto");

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { parentId: parent.id, description: "Sob Valoran" }),
      params({ projectId: project.id, kind: "location", id: child.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.location.findUnique({ where: { id: child.id } });
    expect(reloaded?.parentId).toBe(parent.id);
    expect(reloaded?.description).toBe("Sob Valoran");
  });

  it("rejects anti-cycle (parentId === id) with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const loc = await makeLocation(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { parentId: loc.id }),
      params({ projectId: project.id, kind: "location", id: loc.id }),
    );
    expect(res.status).toBe(400);
  });

  it("updates item name and stringifies metaJson", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const item = await makeItem(project.id, "Antigo");

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        name: "Selo do Magistrado",
        metaJson: { tipo: "selo", uso: "decretos" },
      }),
      params({ projectId: project.id, kind: "item", id: item.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.item.findUnique({ where: { id: item.id } });
    expect(reloaded?.name).toBe("Selo do Magistrado");
    expect(typeof reloaded?.metaJson).toBe("string");
    expect(JSON.parse(reloaded!.metaJson!)).toEqual({ tipo: "selo", uso: "decretos" });
  });

  it("returns 404 for location not in the project", async () => {
    const user = await makeUser();
    const projectA = await makeProject(user.id);
    const projectB = await makeProject(user.id, { title: "B" });
    const loc = await makeLocation(projectB.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { name: "Hack" }),
      params({ projectId: projectA.id, kind: "location", id: loc.id }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid kind", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { name: "x" }),
      params({ projectId: project.id, kind: "weapon", id: "anyid" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/world/[projectId]/[kind]/[id]", () => {
  it("deletes a location", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const loc = await makeLocation(project.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, kind: "location", id: loc.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.location.findUnique({ where: { id: loc.id } })).toBeNull();
  });

  it("deletes an item", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const item = await makeItem(project.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, kind: "item", id: item.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.item.findUnique({ where: { id: item.id } })).toBeNull();
  });
});
