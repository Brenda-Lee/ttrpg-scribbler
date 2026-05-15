import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeTwoUsers } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { GET, POST } from "../../app/api/events/[projectId]/route";
import { PATCH, DELETE } from "../../app/api/events/[projectId]/[eventId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/events/[projectId]", () => {
  it("creates an event with default color and increasing sortOrder", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const r1 = await POST(
      jsonRequest("POST", "http://t/", { title: "Queda da Coroa" }),
      params({ projectId: project.id }),
    );
    expect(r1.status).toBe(200);
    const r2 = await POST(
      jsonRequest("POST", "http://t/", { title: "Cataclismo", dateLabel: "Ano 0" }),
      params({ projectId: project.id }),
    );
    expect(r2.status).toBe(200);

    const events = await prisma.event.findMany({
      where: { projectId: project.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(events).toHaveLength(2);
    expect(events[0].sortOrder).toBeLessThan(events[1].sortOrder);
    expect(events[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("rejects invalid color with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { title: "x", color: "blue" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for another user's project", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { title: "x" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/[projectId]", () => {
  it("returns events ordered by sortOrder", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await prisma.event.create({
      data: { projectId: project.id, title: "Segundo", sortOrder: 2 },
    });
    await prisma.event.create({
      data: { projectId: project.id, title: "Primeiro", sortOrder: 1 },
    });

    const res = await GET(
      jsonRequest("GET", `http://t/api/events/${project.id}`),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ title: string }>;
    expect(list.map((e) => e.title)).toEqual(["Primeiro", "Segundo"]);
  });
});

describe("PATCH /api/events/[projectId]/[eventId]", () => {
  it("updates title, dateLabel and color", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ev = await prisma.event.create({
      data: { projectId: project.id, title: "Antigo", sortOrder: 0 },
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        title: "Novo",
        dateLabel: "Ano 312",
        color: "#a855f7",
      }),
      params({ projectId: project.id, eventId: ev.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.event.findUnique({ where: { id: ev.id } });
    expect(reloaded?.title).toBe("Novo");
    expect(reloaded?.dateLabel).toBe("Ano 312");
    expect(reloaded?.color).toBe("#a855f7");
  });

  it("supports swap-style reorder via sortOrder", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const a = await prisma.event.create({
      data: { projectId: project.id, title: "A", sortOrder: 0 },
    });
    const b = await prisma.event.create({
      data: { projectId: project.id, title: "B", sortOrder: 1 },
    });

    // troca: A vira sortOrder 1, B vira 0
    await PATCH(
      jsonRequest("PATCH", "http://t/", { sortOrder: 1 }),
      params({ projectId: project.id, eventId: a.id }),
    );
    await PATCH(
      jsonRequest("PATCH", "http://t/", { sortOrder: 0 }),
      params({ projectId: project.id, eventId: b.id }),
    );

    const reloadedA = await prisma.event.findUnique({ where: { id: a.id } });
    const reloadedB = await prisma.event.findUnique({ where: { id: b.id } });
    expect(reloadedA?.sortOrder).toBe(1);
    expect(reloadedB?.sortOrder).toBe(0);
  });

  it("returns 404 for another user's event", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const ev = await prisma.event.create({
      data: { projectId: project.id, title: "x", sortOrder: 0 },
    });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ projectId: project.id, eventId: ev.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/events/[projectId]/[eventId]", () => {
  it("removes the event", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const ev = await prisma.event.create({
      data: { projectId: project.id, title: "x", sortOrder: 0 },
    });

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, eventId: ev.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.event.findUnique({ where: { id: ev.id } })).toBeNull();
  });
});
