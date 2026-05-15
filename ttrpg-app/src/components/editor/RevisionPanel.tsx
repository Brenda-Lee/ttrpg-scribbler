"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/stores/workspace";
import { checkText, type Issue } from "@/lib/grammar/check";
import { AlertTriangle, Info, AlertCircle, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

const SEVERITY_COLOR = {
  info: "text-sky-500",
  warning: "text-amber-500",
  error: "text-destructive",
} as const;

export function RevisionPanel() {
  const text = useWorkspace((s) => s.currentText);
  const glossary = useWorkspace((s) => s.glossaryWords);

  const issues = useMemo(() => {
    if (!text) return [];
    return checkText(text, { glossary });
  }, [text, glossary]);

  if (text === null) {
    return null;
  }

  if (!text.trim()) {
    return (
      <Container>
        <EmptyState message="Sem texto para revisar." />
      </Container>
    );
  }

  if (issues.length === 0) {
    return (
      <Container>
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <SparklesIcon className="h-3.5 w-3.5" />
          Nenhum problema encontrado.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {issues.length} {issues.length === 1 ? "ocorrência" : "ocorrências"}
      </p>
      <ul className="space-y-1.5">
        {issues.map((issue, i) => (
          <IssueRow key={`${issue.ruleId}-${issue.offset}-${i}`} issue={issue} fullText={text} />
        ))}
      </ul>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-3 mt-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <SparklesIcon className="h-3.5 w-3.5" /> Revisão (PT-BR)
      </h3>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>;
}

function IssueRow({ issue, fullText }: { issue: Issue; fullText: string }) {
  const Icon = SEVERITY_ICON[issue.severity];
  const colorClass = SEVERITY_COLOR[issue.severity];

  // Mostra um trecho do texto ao redor da issue para contexto.
  const start = Math.max(0, issue.offset - 20);
  const end = Math.min(fullText.length, issue.offset + issue.length + 20);
  const snippet = fullText.slice(start, end).replace(/\s+/g, " ");

  return (
    <li className="rounded-md border bg-card/50 p-2 text-xs">
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", colorClass)} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="leading-snug">{issue.message}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">…{snippet}…</p>
          {issue.suggestion ? (
            <p className="text-[10px] text-muted-foreground">
              Sugestão:{" "}
              <span className="font-mono font-medium text-foreground">
                {JSON.stringify(issue.suggestion)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
