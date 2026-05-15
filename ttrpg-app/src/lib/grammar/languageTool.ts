import type { Issue, Severity } from "./rules";

/**
 * Resposta do endpoint /v2/check do LanguageTool (subset que usamos).
 */
type LTMatch = {
  message: string;
  offset: number;
  length: number;
  rule?: { id?: string; category?: { id?: string } };
  replacements?: Array<{ value: string }>;
  type?: { typeName?: string };
};

type LTResponse = {
  matches?: LTMatch[];
};

const CATEGORY_TO_SEVERITY: Record<string, Severity> = {
  TYPOS: "error",
  GRAMMAR: "error",
  PUNCTUATION: "warning",
  STYLE: "info",
  TYPOGRAPHY: "info",
  CASING: "warning",
};

export function mapMatchToIssue(match: LTMatch, offsetShift = 0): Issue {
  const categoryId = match.rule?.category?.id ?? "";
  const severity = CATEGORY_TO_SEVERITY[categoryId] ?? "warning";
  return {
    ruleId: `lt:${match.rule?.id ?? categoryId ?? "unknown"}`,
    message: match.message,
    offset: match.offset + offsetShift,
    length: match.length,
    suggestion: match.replacements?.[0]?.value,
    severity,
  };
}

/**
 * Faz chunking por parágrafo e chama o LanguageTool para cada um, retornando
 * issues com offsets ajustados ao texto original.
 *
 * Recebe um `fetcher` injetado para facilitar testes (default: fetch global).
 */
export async function checkWithLanguageTool(args: {
  text: string;
  endpoint: string;
  language?: string;
  fetcher?: typeof fetch;
  concurrency?: number;
}): Promise<Issue[]> {
  const { text, endpoint, language = "pt-BR" } = args;
  const fetcher = args.fetcher ?? fetch;
  const concurrency = args.concurrency ?? 4;
  if (!text.trim()) return [];

  const paragraphs = splitParagraphsWithOffsets(text);
  const tasks = paragraphs.map((p) => () => fetchChunk(p.text, p.offset, endpoint, language, fetcher));
  const results = await runWithCap(tasks, concurrency);
  return results.flat().sort((a, b) => a.offset - b.offset);
}

async function fetchChunk(
  text: string,
  offsetShift: number,
  endpoint: string,
  language: string,
  fetcher: typeof fetch,
): Promise<Issue[]> {
  if (!text.trim()) return [];
  const body = new URLSearchParams({ text, language });
  const res = await fetcher(`${endpoint.replace(/\/$/, "")}/v2/check`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as LTResponse;
  if (!data.matches) return [];
  return data.matches.map((m) => mapMatchToIssue(m, offsetShift));
}

export function splitParagraphsWithOffsets(text: string): Array<{ text: string; offset: number }> {
  const out: Array<{ text: string; offset: number }> = [];
  const re = /\n\n+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ text: text.slice(last, m.index), offset: last });
    last = m.index + m[0].length;
  }
  out.push({ text: text.slice(last), offset: last });
  return out;
}

async function runWithCap<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++;
      results[idx] = await tasks[idx]!();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
