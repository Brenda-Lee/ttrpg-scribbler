import { beforeEach, describe, it, expect } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeCharacter,
  makeGlossaryTerm,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { prisma } from "@/lib/db";
import { GET, POST } from "../../app/api/glossary/[projectId]/route";
import { PATCH, DELETE } from "../../app/api/glossary/[projectId]/[termId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/glossary/[projectId]", () => {
  it("creates a term and generates slug via slugify", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        term: "Espelho de Anethel",
        definition: "Artefato pré-cataclísmico.",
        partOfSpeech: "PROPER_NOUN",
        treatAsProper: true,
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const t = (await res.json()) as { id: string; slug: string; term: string };
    expect(t.term).toBe("Espelho de Anethel");
    expect(t.slug).toBe("espelho-de-anethel");
  });

  it("returns 409 for duplicate slug", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeGlossaryTerm(project.id, { term: "Valoran", slug: "valoran" });

    const res = await POST(
      jsonRequest("POST", "http://t/", { term: "Valoran", definition: "x" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects empty definition with 400", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", { term: "x", definition: "" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(400);
  });

  it("links term to relatedCharacterId", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const char = await makeCharacter(project.id);

    const res = await POST(
      jsonRequest("POST", "http://t/", {
        term: "Sa'Elis",
        definition: "Maga errante.",
        relatedCharacterId: char.id,
      }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string };
    const reloaded = await prisma.glossaryTerm.findUnique({ where: { id: created.id } });
    expect(reloaded?.relatedCharacterId).toBe(char.id);
  });
});

describe("GET /api/glossary/[projectId]", () => {
  it("returns all terms when no query", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeGlossaryTerm(project.id, { term: "Glamour", slug: "glamour" });
    await makeGlossaryTerm(project.id, { term: "Véu", slug: "veu" });

    const res = await GET(
      jsonRequest("GET", `http://t/api/glossary/${project.id}`),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{ term: string }>;
    expect(list).toHaveLength(2);
  });

  it("filters by ?q=", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeGlossaryTerm(project.id, { term: "Glamour", slug: "glamour" });
    await makeGlossaryTerm(project.id, { term: "Valoran", slug: "valoran" });

    const res = await GET(
      jsonRequest("GET", `http://t/api/glossary/${project.id}?q=Glam`),
      params({ projectId: project.id }),
    );
    const list = (await res.json()) as Array<{ term: string }>;
    expect(list).toHaveLength(1);
    expect(list[0].term).toBe("Glamour");
  });

  it("returns 404 for another user's project", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);

    const res = await GET(
      jsonRequest("GET", `http://t/api/glossary/${project.id}`),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/glossary/[projectId]/[termId]", () => {
  it("regenerates slug when term changes", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const term = await makeGlossaryTerm(project.id, { term: "Antigo", slug: "antigo" });

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { term: "Espelho de Anethel" }),
      params({ projectId: project.id, termId: term.id }),
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.glossaryTerm.findUnique({ where: { id: term.id } });
    expect(reloaded?.term).toBe("Espelho de Anethel");
    expect(reloaded?.slug).toBe("espelho-de-anethel");
  });

  it("returns 404 for another user's term", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const term = await makeGlossaryTerm(project.id);

    const res = await PATCH(
      jsonRequest("PATCH", "http://t/", { definition: "Hack" }),
      params({ projectId: project.id, termId: term.id }),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/glossary/[projectId]/[termId]", () => {
  it("removes the term", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    const term = await makeGlossaryTerm(project.id);

    const res = await DELETE(
      jsonRequest("DELETE", "http://t/"),
      params({ projectId: project.id, termId: term.id }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.glossaryTerm.findUnique({ where: { id: term.id } })).toBeNull();
  });
});
