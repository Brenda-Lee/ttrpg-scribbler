"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import {
  WRITING_STYLES,
  WRITING_STYLE_LABEL,
  type WritingStyle,
  type ExportKind,
} from "@/lib/export/style";

type SceneNode = { id: string; title: string };
type ChapterNode = { id: string; title: string; scenes: SceneNode[] };
type ActNode = { id: string; title: string; chapters: ChapterNode[] };

export function ExportPicker({
  projectId,
  projectTitle,
  tree,
}: {
  projectId: string;
  projectTitle: string;
  tree: ActNode[];
}) {
  const [kind, setKind] = useState<ExportKind>("project");
  const [targetId, setTargetId] = useState<string>("");
  const [style, setStyle] = useState<WritingStyle>("FORMAL");

  // O alvo válido para o tipo selecionado
  const targetOptions =
    kind === "project"
      ? [{ id: projectId, label: projectTitle }]
      : kind === "act"
        ? tree.map((a) => ({ id: a.id, label: a.title }))
        : kind === "chapter"
          ? tree.flatMap((a) =>
              a.chapters.map((c) => ({ id: c.id, label: `${a.title} › ${c.title}` })),
            )
          : tree.flatMap((a) =>
              a.chapters.flatMap((c) =>
                c.scenes.map((s) => ({
                  id: s.id,
                  label: `${a.title} › ${c.title} › ${s.title}`,
                })),
              ),
            );

  const resolvedTargetId =
    kind === "project" ? projectId : targetId || targetOptions[0]?.id || "";

  const printUrl = resolvedTargetId
    ? `/projects/${projectId}/export/print?kind=${kind}&id=${resolvedTargetId}&style=${style}`
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileDown className="h-6 w-6 text-muted-foreground" />
          Exportar
        </h1>
        <p className="text-sm text-muted-foreground">
          Gera um PDF via di&aacute;logo de impress&atilde;o do navegador. Escolha &quot;Salvar
          como PDF&quot; no destino.
        </p>
      </header>

      <Card className="space-y-4 p-5">
        <section className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            O que exportar
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["scene", "chapter", "act", "project"] as ExportKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setTargetId("");
                }}
                className={
                  "rounded-md border px-3 py-2 text-sm transition-colors " +
                  (kind === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent")
                }
              >
                {k === "scene"
                  ? "Cena"
                  : k === "chapter"
                    ? "Capítulo"
                    : k === "act"
                      ? "Ato"
                      : "Projeto inteiro"}
              </button>
            ))}
          </div>
        </section>

        {kind !== "project" ? (
          <section className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Alvo
            </Label>
            <select
              value={targetId || targetOptions[0]?.id || ""}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={targetOptions.length === 0}
            >
              {targetOptions.length === 0 ? (
                <option value="">Nada para exportar</option>
              ) : (
                targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </section>
        ) : null}

        <section className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Estilo de escrita
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {WRITING_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={
                  "rounded-md border px-3 py-2 text-sm transition-colors " +
                  (style === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent")
                }
              >
                {WRITING_STYLE_LABEL[s]}
              </button>
            ))}
          </div>
          <StyleHint style={style} />
        </section>

        <footer className="flex justify-end pt-2">
          <Button asChild disabled={!printUrl}>
            <Link href={printUrl} target="_blank" rel="noopener noreferrer">
              Visualizar e exportar
            </Link>
          </Button>
        </footer>
      </Card>
    </div>
  );
}

function StyleHint({ style }: { style: WritingStyle }) {
  const text =
    style === "ABNT"
      ? "Times New Roman 12pt, espaçamento 1.5, margens 3/2/2/3 cm, recuo 1.25 cm."
      : style === "FORMAL"
        ? "Fonte serifada, espaçamento 1.5, margens clássicas."
        : "Sans-serif, layout livre, voltado para leitura informal.";
  return <p className="text-[11px] text-muted-foreground">{text}</p>;
}
