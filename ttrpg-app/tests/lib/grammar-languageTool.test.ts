import { describe, expect, it, vi } from "vitest";
import {
  checkWithLanguageTool,
  mapMatchToIssue,
  splitParagraphsWithOffsets,
} from "@/lib/grammar/languageTool";

describe("mapMatchToIssue", () => {
  it("converte match TYPOS em Issue com severity error", () => {
    const issue = mapMatchToIssue(
      {
        message: "Erro de digitação",
        offset: 5,
        length: 3,
        rule: { id: "R1", category: { id: "TYPOS" } },
        replacements: [{ value: "fix" }],
      },
      0,
    );
    expect(issue.ruleId).toBe("lt:R1");
    expect(issue.severity).toBe("error");
    expect(issue.suggestion).toBe("fix");
    expect(issue.offset).toBe(5);
  });

  it("aplica offsetShift", () => {
    const issue = mapMatchToIssue(
      { message: "x", offset: 2, length: 1, rule: { id: "R", category: { id: "STYLE" } } },
      100,
    );
    expect(issue.offset).toBe(102);
    expect(issue.severity).toBe("info");
  });

  it("usa severity 'warning' para categorias desconhecidas", () => {
    const issue = mapMatchToIssue({
      message: "y",
      offset: 0,
      length: 1,
      rule: { id: "R", category: { id: "UNKNOWN" } },
    });
    expect(issue.severity).toBe("warning");
  });
});

describe("splitParagraphsWithOffsets", () => {
  it("mantém offsets corretos para múltiplos parágrafos", () => {
    const text = "Primeiro parágrafo.\n\nSegundo parágrafo.\n\nTerceiro.";
    const out = splitParagraphsWithOffsets(text);
    expect(out).toHaveLength(3);
    expect(out[0]!.offset).toBe(0);
    expect(out[0]!.text).toBe("Primeiro parágrafo.");
    expect(out[1]!.offset).toBe(21);
    expect(out[2]!.text).toBe("Terceiro.");
  });

  it("retorna 1 parágrafo quando não há quebras duplas", () => {
    const text = "Só uma linha.";
    expect(splitParagraphsWithOffsets(text)).toEqual([{ text, offset: 0 }]);
  });
});

describe("checkWithLanguageTool", () => {
  it("agrega issues de múltiplos parágrafos com offsets globais", async () => {
    const para1 = "primeiro";
    const para2 = "segundo";
    const text = `${para1}\n\n${para2}`;

    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = new URLSearchParams(init?.body as string);
      const t = body.get("text");
      if (t === para1) {
        return new Response(
          JSON.stringify({
            matches: [
              {
                message: "issue 1",
                offset: 0,
                length: 8,
                rule: { id: "RA", category: { id: "GRAMMAR" } },
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (t === para2) {
        return new Response(
          JSON.stringify({
            matches: [
              {
                message: "issue 2",
                offset: 0,
                length: 7,
                rule: { id: "RB", category: { id: "STYLE" } },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ matches: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const issues = await checkWithLanguageTool({
      text,
      endpoint: "http://lt.local",
      fetcher,
    });

    expect(issues).toHaveLength(2);
    // segundo parágrafo começa em offset = `${para1}\n\n`.length = 10
    expect(issues[0]!.offset).toBe(0);
    expect(issues[1]!.offset).toBe(10);
    expect(issues[1]!.ruleId).toBe("lt:RB");
  });

  it("retorna lista vazia para texto vazio", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await checkWithLanguageTool({ text: "", endpoint: "http://lt", fetcher })).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("ignora chunks com erro HTTP sem propagar", async () => {
    const fetcher = vi.fn(
      async () => new Response("boom", { status: 500 }),
    ) as unknown as typeof fetch;
    const issues = await checkWithLanguageTool({
      text: "qualquer coisa",
      endpoint: "http://lt",
      fetcher,
    });
    expect(issues).toEqual([]);
  });
});
