import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import { makeUser } from "../helpers/factories";
import { jsonRequest } from "../helpers/request";

const originalEnv = { ...process.env };

beforeEach(async () => {
  await resetDb();
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("POST /api/grammar/check", () => {
  it("retorna disabled:true quando LANGUAGETOOL_URL ausente", async () => {
    delete process.env.LANGUAGETOOL_URL;
    await makeUser();
    const { POST } = await import("../../app/api/grammar/check/route");
    const res = await POST(jsonRequest("POST", "http://t/", { text: "ola" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { disabled?: boolean; issues: unknown[] };
    expect(data.disabled).toBe(true);
    expect(data.issues).toEqual([]);
  });

  it("encaminha para LanguageTool quando URL configurada e devolve issues", async () => {
    await makeUser();
    process.env.LANGUAGETOOL_URL = "http://lt.local";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          matches: [
            {
              message: "fix",
              offset: 0,
              length: 3,
              rule: { id: "R1", category: { id: "GRAMMAR" } },
              replacements: [{ value: "foo" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("../../app/api/grammar/check/route");
    const res = await POST(jsonRequest("POST", "http://t/", { text: "olá" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { issues: Array<{ message: string }> };
    expect(data.issues).toHaveLength(1);
    expect(data.issues[0]!.message).toBe("fix");
  });

  it("retorna 401 sem usuário (auth bypass desligado)", async () => {
    process.env.LANGUAGETOOL_URL = "http://lt.local";
    process.env.AUTH_BYPASS = "0";

    const { POST } = await import("../../app/api/grammar/check/route");
    const res = await POST(jsonRequest("POST", "http://t/", { text: "x" }));
    expect(res.status).toBe(401);
  });
});
