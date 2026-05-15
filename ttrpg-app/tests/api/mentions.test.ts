import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import {
  makeUser,
  makeProject,
  makeCharacter,
  makeLocation,
  makeItem,
  makeLore,
  makeGlossaryTerm,
  makeTwoUsers,
} from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { GET } from "../../app/api/mentions/[projectId]/route";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/mentions/[projectId]", () => {
  it("retorna union de entidades agrupadas por kind", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeCharacter(project.id, "Sa'Elis");
    await makeLocation(project.id, "Valoran");
    await makeItem(project.id, "Espelho de Anethel");
    await makeLore(project.id, { title: "Culto do Véu" });
    await makeGlossaryTerm(project.id, { term: "Glamour", slug: "glamour" });

    const res = await GET(
      jsonRequest("GET", "http://t/?q="),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      items: Array<{ kind: string; label: string }>;
    };
    const kinds = new Set(data.items.map((i) => i.kind));
    expect(kinds.has("character")).toBe(true);
    expect(kinds.has("location")).toBe(true);
    expect(kinds.has("item")).toBe(true);
    expect(kinds.has("lore")).toBe(true);
    expect(kinds.has("glossary")).toBe(true);
  });

  it("filtra por substring quando q é informado", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeCharacter(project.id, "Jorek");
    await makeCharacter(project.id, "Ivera");
    await makeLocation(project.id, "Valoran");

    const res = await GET(
      jsonRequest("GET", "http://t/?q=jor"),
      params({ projectId: project.id }),
    );
    const data = (await res.json()) as { items: Array<{ label: string }> };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.label).toBe("Jorek");
  });

  it("retorna 404 para projeto de outro usuário", async () => {
    const { other } = await makeTwoUsers();
    const project = await makeProject(other.id);
    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(404);
  });

  it("cada item tem id único, entityId e label", async () => {
    const user = await makeUser();
    const project = await makeProject(user.id);
    await makeCharacter(project.id, "Alice");

    const res = await GET(
      jsonRequest("GET", "http://t/"),
      params({ projectId: project.id }),
    );
    const data = (await res.json()) as {
      items: Array<{ id: string; entityId: string; label: string; kind: string }>;
    };
    const character = data.items.find((i) => i.kind === "character");
    expect(character).toBeTruthy();
    expect(character!.id).toMatch(/^character-/);
    expect(character!.entityId).not.toBe(character!.id);
    expect(character!.label).toBe("Alice");
  });
});
