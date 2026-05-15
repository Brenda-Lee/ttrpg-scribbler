"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { ExportKind, WritingStyle } from "@/lib/export/style";
import { WRITING_STYLE_LABEL } from "@/lib/export/style";

type SceneOut = { id: string; title: string; html: string };
type ChapterOut = { id: string; title: string; summary: string | null; scenes: SceneOut[] };
type ActOut = { id: string; title: string; chapters: ChapterOut[] };

export function PrintView({
  style,
  kind,
  project,
  acts,
  glossary,
  lore,
}: {
  style: WritingStyle;
  kind: ExportKind;
  project: { title: string; summary: string | null; system: string | null };
  acts: ActOut[];
  glossary: Array<{ term: string; definition: string }>;
  lore: Array<{ title: string; category: string; body: string }>;
}) {
  const searchParams = useSearchParams();
  const auto = searchParams.get("auto");
  const skipAutoPrint = auto === "0";

  useEffect(() => {
    if (skipAutoPrint) {
      // Modo headless/puppeteer: marca o documento como pronto e pula o print do navegador.
      const t = setTimeout(() => {
        document.documentElement.setAttribute("data-print-ready", "1");
      }, 250);
      return () => clearTimeout(t);
    }
    // Aguarda o layout pintar antes de abrir o diálogo de impressão.
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [skipAutoPrint]);

  return (
    <>
      <PrintStyles style={style} />
      <div className={`print-doc print-style-${style.toLowerCase()}`}>
        <div className="screen-only mx-auto mb-4 mt-4 max-w-3xl rounded-md border bg-card p-3 text-sm text-muted-foreground">
          Pr&eacute;-visualiza&ccedil;&atilde;o de impress&atilde;o ({WRITING_STYLE_LABEL[style]}). Use{" "}
          <button
            type="button"
            onClick={() => window.print()}
            className="underline hover:text-foreground"
          >
            imprimir
          </button>{" "}
          e escolha &quot;Salvar como PDF&quot;.
        </div>

        {kind === "project" ? <CoverPage project={project} /> : null}

        {kind === "project" && acts.length > 0 ? <TableOfContents acts={acts} /> : null}

        <main className="print-body">
          {acts.map((act) => (
            <section key={act.id} className="print-act">
              {kind === "project" || kind === "act" ? (
                <h1 className="print-act-title">{act.title}</h1>
              ) : null}
              {act.chapters.map((chapter) => (
                <section key={chapter.id} className="print-chapter">
                  {kind !== "scene" ? (
                    <h2 className="print-chapter-title">{chapter.title}</h2>
                  ) : null}
                  {chapter.summary && kind !== "scene" ? (
                    <p className="print-chapter-summary">{chapter.summary}</p>
                  ) : null}
                  {chapter.scenes.map((scene) => (
                    <article key={scene.id} className="print-scene">
                      <h3 className="print-scene-title">{scene.title}</h3>
                      <div
                        className="print-scene-content"
                        dangerouslySetInnerHTML={{ __html: scene.html || "<p></p>" }}
                      />
                    </article>
                  ))}
                </section>
              ))}
            </section>
          ))}
        </main>

        {kind === "project" && glossary.length > 0 ? (
          <section className="print-appendix">
            <h1 className="print-act-title">Glossário</h1>
            <dl className="print-glossary">
              {glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {kind === "project" && lore.length > 0 ? (
          <section className="print-appendix">
            <h1 className="print-act-title">Lore</h1>
            {lore.map((l) => (
              <article key={l.title} className="print-lore">
                <h2 className="print-chapter-title">{l.title}</h2>
                <p className="print-lore-category">{l.category}</p>
                <div className="print-lore-body">
                  {l.body.split(/\n+/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

function CoverPage({
  project,
}: {
  project: { title: string; summary: string | null; system: string | null };
}) {
  return (
    <section className="print-cover">
      <div className="print-cover-inner">
        <h1>{project.title}</h1>
        {project.system ? <p className="print-cover-system">{project.system}</p> : null}
        {project.summary ? <p className="print-cover-summary">{project.summary}</p> : null}
      </div>
    </section>
  );
}

function TableOfContents({ acts }: { acts: ActOut[] }) {
  return (
    <section className="print-toc">
      <h1>Sumário</h1>
      <ol>
        {acts.map((a) => (
          <li key={a.id}>
            <span className="print-toc-act">{a.title}</span>
            {a.chapters.length > 0 ? (
              <ol>
                {a.chapters.map((c) => (
                  <li key={c.id}>{c.title}</li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PrintStyles({ style }: { style: WritingStyle }) {
  const css = buildPrintCss(style);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

function buildPrintCss(style: WritingStyle): string {
  // Base shared rules
  const base = `
  .screen-only { display: block; }
  .print-doc { background: white; color: #1a1a1a; }
  .print-cover, .print-toc, .print-appendix { page-break-after: always; }
  .print-act { page-break-before: always; }
  .print-act:first-of-type { page-break-before: avoid; }
  .print-act-title { font-size: 28pt; margin: 2em 0 1em; text-align: center; }
  .print-chapter { margin-top: 2.5em; }
  .print-chapter-title { font-size: 18pt; margin: 1.4em 0 0.6em; }
  .print-chapter-summary { font-style: italic; color: #555; margin-bottom: 1em; }
  .print-scene { margin-top: 1.6em; }
  .print-scene-title { font-size: 13pt; font-weight: 600; margin: 1em 0 0.4em; color: #444; }
  .print-scene-content p { margin: 0 0 0.6em; text-align: justify; }
  .print-scene-content h1 { font-size: 18pt; margin: 1em 0 0.5em; }
  .print-scene-content h2 { font-size: 15pt; margin: 1em 0 0.5em; }
  .print-scene-content h3 { font-size: 13pt; margin: 0.8em 0 0.4em; }
  .print-scene-content ul, .print-scene-content ol { padding-left: 1.5em; }
  .print-scene-content blockquote { border-left: 3px solid #999; padding-left: 1em; color: #555; margin: 0.8em 0; }
  .print-scene-content code { font-family: 'Courier New', monospace; background: #f3f3f3; padding: 0 0.2em; }
  .print-scene-content a { color: #1a4d8f; text-decoration: underline; }
  .print-scene-content .mention { background: #fff2c0; border-radius: 3px; padding: 0 0.15em; }
  .print-scene-content img, .print-scene-content .tiptap-image { max-width: 100%; height: auto; margin: 0.6em 0; }
  /* Áudio não pode ser embutido em PDF — substitui por linha textual. */
  .print-scene-content [data-audio] audio { display: none; }
  .print-scene-content [data-audio]::before {
    content: "🎵 áudio: " attr(data-audio-title);
    display: inline-block;
    color: #555;
    font-style: italic;
    padding: 0.2em 0.4em;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f7f7f7;
  }
  .print-cover { display: flex; align-items: center; justify-content: center; min-height: 90vh; text-align: center; }
  .print-cover-inner h1 { font-size: 36pt; margin: 0 0 0.5em; }
  .print-cover-system { font-size: 14pt; color: #666; margin: 0 0 1em; }
  .print-cover-summary { font-size: 12pt; max-width: 30em; margin: 1em auto; font-style: italic; }
  .print-toc h1 { font-size: 22pt; margin: 1em 0 0.8em; }
  .print-toc ol { padding-left: 1.5em; }
  .print-toc-act { font-weight: 600; }
  .print-glossary dt { font-weight: 600; margin-top: 0.6em; }
  .print-glossary dd { margin: 0.2em 0 0.4em 1em; }
  .print-lore-category { font-size: 10pt; text-transform: uppercase; color: #666; letter-spacing: 0.04em; }

  @media screen {
    .print-doc {
      max-width: 50em;
      margin: 0 auto;
      padding: 4em 3em;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
  }

  @media print {
    .screen-only { display: none !important; }
    /* esconde o shell do app (TopTabs, LeftSidebar, RightPanel) ao imprimir */
    header, aside { display: none !important; }
    html, body { background: white !important; height: auto !important; }
    main { overflow: visible !important; height: auto !important; }
    .print-doc { padding: 0; box-shadow: none; max-width: none; margin: 0; }
  }
  `;

  const styled =
    style === "ABNT"
      ? `
      @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
      .print-doc { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }
      .print-scene-content p { text-indent: 1.25cm; margin: 0; }
      .print-scene-content p + p { margin-top: 0; }
    `
      : style === "FORMAL"
        ? `
      @page { size: A4; margin: 2.5cm; }
      .print-doc { font-family: 'Georgia', 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
      .print-scene-content p { text-indent: 0; }
    `
        : `
      @page { size: A4; margin: 2cm; }
      .print-doc { font-family: 'Inter', 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.6; }
      .print-scene-content p { text-indent: 0; }
    `;

  return base + styled;
}
