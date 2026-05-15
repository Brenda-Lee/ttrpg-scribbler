"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { PanelRight, X, CircleDashed, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RevisionPanel } from "@/components/editor/RevisionPanel";
import { checkText } from "@/lib/grammar/check";

export function RightPanel({ children }: { children?: React.ReactNode }) {
  const open = useWorkspace((s) => s.rightPanelOpen);
  const toggle = useWorkspace((s) => s.toggleRightPanel);
  const saveStatus = useWorkspace((s) => s.saveStatus);
  const text = useWorkspace((s) => s.currentText);
  const glossary = useWorkspace((s) => s.glossaryWords);

  const issueCount = useMemo(() => {
    if (!text) return 0;
    return checkText(text, { glossary }).length;
  }, [text, glossary]);

  return (
    <>
      {!open ? (
        <div className="absolute right-2 top-14 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Abrir painel"
            className="relative"
          >
            <PanelRight className="h-4 w-4" />
            {issueCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {issueCount > 99 ? "99+" : issueCount}
              </span>
            ) : null}
          </Button>
        </div>
      ) : null}
      <aside
        className={cn(
          "hidden w-72 shrink-0 flex-col border-l bg-card md:flex",
          !open && "md:hidden",
        )}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Detalhes
            <SaveBadge status={saveStatus} />
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-sm">
          {children ?? (
            <p className="text-muted-foreground">Selecione uma cena ou entidade para ver detalhes aqui.</p>
          )}
          <RevisionPanel />
        </div>
      </aside>
    </>
  );
}

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving")
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> salvando
      </span>
    );
  if (status === "saved")
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-emerald-500">
        <CheckCircle2 className="h-3 w-3" /> salvo
      </span>
    );
  if (status === "error")
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-destructive">
        <AlertCircle className="h-3 w-3" /> erro
      </span>
    );
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground/60">
      <CircleDashed className="h-3 w-3" />
    </span>
  );
}
