import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { getCurrentUser, isAuthRedirect } from "@/lib/auth";
import { checkWithLanguageTool } from "@/lib/grammar/languageTool";
import type { Issue } from "@/lib/grammar/rules";

const Schema = z.object({
  text: z.string().max(50_000),
  language: z.string().min(2).max(10).optional(),
});

// Cache em memória — vive enquanto o processo do servidor estiver ativo.
type CacheEntry = { expiresAt: number; issues: Issue[] };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000; // 30 min
const CACHE_LIMIT = 200;

function cacheKey(text: string, language: string): string {
  return crypto.createHash("sha256").update(`${language}::${text}`).digest("hex");
}

function getCached(key: string): Issue[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.issues;
}

function setCached(key: string, issues: Issue[]) {
  if (cache.size >= CACHE_LIMIT) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { expiresAt: Date.now() + TTL_MS, issues });
}

export async function POST(req: Request) {
  // Auth básica — não queremos expor o proxy ao mundo.
  try {
    await getCurrentUser();
  } catch (err) {
    if (isAuthRedirect(err)) throw err;
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const endpoint = process.env.LANGUAGETOOL_URL;
  if (!endpoint) {
    return NextResponse.json({ disabled: true, issues: [] satisfies Issue[] });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const language = parsed.data.language ?? "pt-BR";
  const text = parsed.data.text;

  if (!text.trim()) {
    return NextResponse.json({ issues: [] satisfies Issue[] });
  }

  const key = cacheKey(text, language);
  const cached = getCached(key);
  if (cached) {
    return NextResponse.json({ issues: cached, cached: true });
  }

  try {
    const issues = await checkWithLanguageTool({ text, language, endpoint });
    setCached(key, issues);
    return NextResponse.json({ issues });
  } catch {
    return NextResponse.json({ issues: [] satisfies Issue[], error: "lt_unreachable" }, { status: 200 });
  }
}
