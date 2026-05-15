"use client";

import { useWorkspace } from "@/stores/workspace";
import { Button } from "@/components/ui/button";
import { PanelRight, X, CircleDashed, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function RightPanel({ children }: { children?: React.ReactNode }) {
  const open = useWorkspace((s) => s.rightPanelOpen);
  const toggle = useWorkspace((s) => s.toggleRightPanel);
  const saveStatus = useWorkspace((s) => s.saveStatus);

  return (
    <>
      {!open ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="absolute right-2 top-14 z-10"
          aria-label="Abrir painel"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      ) : null}
      <aside
        className={cn(
          "hidden w-72 shrink-0 flex-col border-l bg-card lg:flex",
          !open && "lg:hidden",
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
