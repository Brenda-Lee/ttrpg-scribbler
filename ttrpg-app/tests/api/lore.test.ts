import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser, makeProject, makeLore, makeTwoUsers } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { GET, POST } from "../../app/api/lore/[projectId]/route";
import { PATCH, DELETE } from "../../app/api/lore/[projectId]/[loreId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/lore/[projectId]", () => {
  it("creates a lore entry with valid category", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        title: "Culto do Véu",
        category: "RELIGION",
        excerpt: "Seita clandestina.",
        body: "Operam em camadas...",
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string; title: string; category: string };
    expect(created.title).toBe("Culto do Véu");
    expect(created.category).toBe("RELIGION");
  });

  it("defaults category to OTHER when omitted", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { title: "Misc" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { category: string };
    expect(created.category).toBe("OTHER");
  });

  it("rejects invalid category with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { title: "x", category: "BOGUS" }),
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

describe("GET /api/lore/[projectId]", () => {
  it("filters by category", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeLore(project.id, { title: "Culto", category: "RELIGION" });
    await makeLore(project.id, { title: "Marés", category: "FESTIVAL" });

    const res = await GET(
      jsonRequest("GET", `http://t/api/lore/${project.id}?category=RELIGION`),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ title: string; category: string }>;
    expect(list).toHaveLength(1);
    expect(list[0].category).toBe("RELIGION");
  });

  it("filters by ?q= (substring match on title)", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeLore(project.id, { title: "Culto do Véu" });
    await makeLore(project.id, { title: "Marés Tristes" });

    const res = await GET(
      jsonRequest("GET", `http://t/api/lore/${project.id}?q=Véu`),
      params({ projectId: project.id }),
    );
    const list = (await res.json()) as Array<{ title: string }>;
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Culto do Véu");
  });
});

describe("PATCH /api/lore/[projectId]/[loreId]", () => {
  it("updates title, category and stringifies metaJson", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const lore = await makeLore(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", {
        title: "Festival das Marés",
        category: "FESTIVAL",
        metaJson: { frequencia: "anual" },
      }),
      params({ projectId: project.id, loreId: lore.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.lore.findUnique({ where: { id: lore.id } });
    expect(reloaded?.title).toBe("Festival das Marés");
    expect(reloaded?.category).toBe("FESTIVAL");
    expect(JSON.parse(reloaded!.metaJson!)).toEqual({ frequencia: "anual" });
  });

  it("returns 404 for another user's lore", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const lore = await makeLore(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { title: "Hack" }),
      params({ projectId: project.id, loreId: lore.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/lore/[projectId]/[loreId]", () => {
  it("removes the lore", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const lore = await makeLore(project.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, loreId: lore.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.lore.findUnique({ where: { id: lore.id } })).toBeNull();
  });
});
