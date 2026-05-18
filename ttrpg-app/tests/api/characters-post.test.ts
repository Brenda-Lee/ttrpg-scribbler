import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "../helpers/db";
import { makeProject, makeUser } from "../helpers/factories";
import { jsonRequest, params } from "../helpers/request";
import { POST } from "../../app/api/characters/[projectId]/route";
import { clearSheetSchemaCache } from "@/lib/sheets/loadSchema";
import fs from "node:fs";
import path from "node:path";

beforeEach(async () => {
  await resetDb();
  clearSheetSchemaCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function makeSystem(slug: string, name: string) {
  const raw = fs.readFileSync(
    path.resolve(`prisma/sheets/${slug}.json`),
    "utf-8",
  );
  return prisma.system.create({ data: { name, slug, rulesJson: raw } });
}

describe("POST /api/characters/[projectId] — transactional sheet creation", () => {
  it("creates the CharacterSheet with the project's system slug", async () => {
    const owner = await makeUser();
    const system = await makeSystem("tormenta20", "Tormenta 20");
    const project = await makeProject(owner.id, { systemId: system.id });

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "Aria", role: "PC" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string };

    const character = await prisma.character.findUnique({
      where: { id: created.id },
      include: { sheet: true },
    });
    expect(character?.sheet).not.toBeNull();
    expect(character?.sheet?.systemSlug).toBe("tormenta20");

    const sheetCount = await prisma.characterSheet.count({
      where: { characterId: created.id },
    });
    expect(sheetCount).toBe(1);

    // dataJson contains tormenta20 base defaults (e.g., defesa_base = 10).
    const data = JSON.parse(character!.sheet!.dataJson);
    expect(data.defesa_base).toBe(10);
    expect(data.tamanho).toBe("Médio");
    expect(data).not.toHaveProperty("defesa_efetiva");
  });

  it("falls back to systemSlug 'generic' when the project has no system", async () => {
    const owner = await makeUser();
    const project = await makeProject(owner.id, { systemId: null });

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "Sem sistema" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string };

    const sheet = await prisma.characterSheet.findUnique({
      where: { characterId: created.id },
    });
    expect(sheet?.systemSlug).toBe("generic");
  });

  it("creates the sheet for a D&D 5e system project", async () => {
    const owner = await makeUser();
    const system = await makeSystem("dnd-5e", "D&D 5e");
    const project = await makeProject(owner.id, { systemId: system.id });

    const res = await POST(
      jsonRequest("POST", "http://t/", { name: "Vinea", role: "PC" }),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    const created = (await res.json()) as { id: string };

    const sheet = await prisma.characterSheet.findUnique({
      where: { characterId: created.id },
    });
    expect(sheet?.systemSlug).toBe("dnd-5e");
    const data = JSON.parse(sheet!.dataJson);
    expect(data.str).toBe(10);
    expect(data.hit_die).toBe("d8");
    expect(data).not.toHaveProperty("str_mod");
  });

  it("rolls back the Character insert when sheet creation fails inside the transaction", async () => {
    const owner = await makeUser();
    const project = await makeProject(owner.id);

    const charactersBefore = await prisma.character.count();
    const sheetsBefore = await prisma.characterSheet.count();

    // The interactive-transaction client `tx` is a proxy distinct from
    // `prisma.*`, so spying on `prisma.characterSheet.create` would not be
    // intercepted. Instead, wrap `$transaction` and hand the route handler a
    // Proxy over the real `tx` that intercepts `characterSheet.create` and
    // rejects — letting the real transaction roll back the Character insert.
    const txSpy = vi
      .spyOn(prisma, "$transaction")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementationOnce((async (fn: any, opts: any) => {
        const original = (
          prisma.$transaction as unknown as typeof prisma.$transaction
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).bind(prisma) as any;
        return original(
          (tx: typeof prisma) => {
            const proxied = new Proxy(tx, {
              get(target, prop, receiver) {
                if (prop === "characterSheet") {
                  return new Proxy(
                    Reflect.get(target, prop, receiver) as object,
                    {
                      get(inner, innerProp, innerReceiver) {
                        if (innerProp === "create") {
                          return () =>
                            Promise.reject(new Error("forced failure"));
                        }
                        return Reflect.get(inner, innerProp, innerReceiver);
                      },
                    },
                  );
                }
                return Reflect.get(target, prop, receiver);
              },
            });
            return fn(proxied);
          },
          opts,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any);

    await expect(
      POST(
        jsonRequest("POST", "http://t/", { name: "Doomed" }),
        params({ projectId: project.id }),
      ),
    ).rejects.toThrow(/forced failure/);

    txSpy.mockRestore();

    const charactersAfter = await prisma.character.count();
    const sheetsAfter = await prisma.characterSheet.count();
    expect(charactersAfter).toBe(charactersBefore);
    expect(sheetsAfter).toBe(sheetsBefore);
  });
});
