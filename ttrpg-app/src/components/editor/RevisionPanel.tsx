"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/stores/workspace";
import { checkText, type Issue } from "@/lib/grammar/check";
import { AlertTriangle, Info, AlertCircle, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type AnnotatedIssue = Issue & { source: "local" | "lt" };

export function RevisionPanel() {
  const text = useWorkspace((s) => s.currentText);
  const glossary = useWorkspace((s) => s.glossaryWords);
  const [ltIssues, setLtIssues] = useState<Issue[]>([]);
  const [ltDisabled, setLtDisabled] = useState<boolean | null>(null);

  // Issues locais — instantâneo, sem rede.
  const localIssues = useMemo(() => {
    if (!text) return [];
    return checkText(text, { glossary });
  }, [text, glossary]);

  // Chama LanguageTool com debounce de 1500ms.
  useEffect(() => {
    if (!text) {
      setLtIssues([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/grammar/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          disabled?: boolean;
          issues?: Issue[];
        };
        if (data.disabled) {
          setLtDisabled(true);
          setLtIssues([]);
        } else {
          setLtDisabled(false);
          setLtIssues(data.issues ?? []);
        }
      } catch {
        // silencioso — mantém apenas issues locais
      }
    }, 1500);
    return () => clearTimeout(handle);
  }, [text]);

  const issues: AnnotatedIssue[] = useMemo(() => {
    const merged: AnnotatedIssue[] = [
      ...localIssues.map((i) => ({ ...i, source: "local" as const })),
      ...ltIssues.map((i) => ({ ...i, source: "lt" as const })),
    ];
    return merged.sort((a, b) => a.offset - b.offset);
  }, [localIssues, ltIssues]);

  if (text === null) {
    return null;
  }

  if (!text.trim()) {
    return (
      <Container ltDisabled={ltDisabled}>
        <EmptyState message="Sem texto para revisar." />
      </Container>
    );
  }

  if (issues.length === 0) {
    return (
      <Container ltDisabled={ltDisabled}>
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <SparklesIcon className="h-3.5 w-3.5" />
          Nenhum problema encontrado.
        </div>
      </Container>
    );
  }

  return (
    <Container ltDisabled={ltDisabled}>
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

function Container({
  children,
  ltDisabled,
}: {
  children: React.ReactNode;
  ltDisabled: boolean | null;
}) {
  return (
    <section className="space-y-2 border-t pt-3 mt-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <SparklesIcon className="h-3.5 w-3.5" /> Revisão (PT-BR)
        {ltDisabled === false ? (
          <Badge variant="secondary" className="text-[8px]">
            LT
          </Badge>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>;
}

function IssueRow({ issue, fullText }: { issue: AnnotatedIssue; fullText: string }) {
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
          <div className="flex items-start gap-1.5">
            <p className="flex-1 leading-snug">{issue.message}</p>
            <Badge
              variant={issue.source === "lt" ? "default" : "secondary"}
              className="shrink-0 text-[8px]"
            >
              {issue.source === "lt" ? "LT" : "Local"}
            </Badge>
          </div>
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
