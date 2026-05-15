import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EXPORT_KINDS, WRITING_STYLES, type ExportKind, type WritingStyle } from "@/lib/export/style";

const Schema = z.object({
  projectId: z.string().min(1),
  kind: z.enum([...EXPORT_KINDS] as [ExportKind, ...ExportKind[]]),
  id: z.string().min(1),
  style: z.enum([...WRITING_STYLES] as [WritingStyle, ...WritingStyle[]]),
});

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  const { projectId, kind, id, style } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true, title: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Lazy import — só carrega o puppeteer quando a rota é chamada,
  // evitando custo de inicialização em cold start de outras rotas.
  const puppeteerMod = await import("puppeteer").catch(() => null);
  if (!puppeteerMod) {
    return NextResponse.json({ error: "pdf_unavailable" }, { status: 503 });
  }
  const puppeteer = puppeteerMod.default;

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const printUrl = `${baseUrl}/projects/${projectId}/export/print?kind=${kind}&id=${id}&style=${style}&auto=0`;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const baseDomain = new URL(baseUrl).hostname;
  const cookies = parseCookieHeader(cookieHeader, baseDomain);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    // Aguarda o flag que o PrintView seta quando termina de montar.
    await page
      .waitForSelector('html[data-print-ready="1"]', { timeout: 30_000 })
      .catch(() => null);

    const margins = marginsFor(style);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: margins,
    });

    const safeTitle = sanitizeFilename(project.title) || "export";
    return new NextResponse(pdf as unknown as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}-${kind}-${style.toLowerCase()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await browser.close().catch(() => null);
  }
}

function parseCookieHeader(
  header: string,
  domain: string,
): Array<{ name: string; value: string; domain: string; path: string }> {
  if (!header) return [];
  return header
    .split(";")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const eq = piece.indexOf("=");
      if (eq === -1) return null;
      const name = piece.slice(0, eq).trim();
      const value = piece.slice(eq + 1).trim();
      if (!name) return null;
      return { name, value, domain, path: "/" };
    })
    .filter((c): c is { name: string; value: string; domain: string; path: string } => c !== null);
}

function marginsFor(style: WritingStyle) {
  if (style === "ABNT") {
    return { top: "3cm", right: "2cm", bottom: "2cm", left: "3cm" };
  }
  if (style === "FORMAL") {
    return { top: "2.5cm", right: "2.5cm", bottom: "2.5cm", left: "2.5cm" };
  }
  return { top: "2cm", right: "2cm", bottom: "2cm", left: "2cm" };
}

function sanitizeFilename(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}
