"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { cn } from "@/lib/utils";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function SaveStatusIndicator() {
  const status = useWorkspace((s) => s.saveStatus);
  const lastSavedAt = useWorkspace((s) => s.lastSavedAt);
  const [, force] = useState(0);

  useEffect(() => {
    if (status !== "saved" || !lastSavedAt) return;
    const interval = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, [status, lastSavedAt]);

  if (status === "idle") return null;

  const map = {
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      text: "Salvando…",
      cls: "text-muted-foreground",
    },
    saved: {
      icon: <Check className="h-3.5 w-3.5" />,
      text: lastSavedAt ? `Salvo às ${formatTime(lastSavedAt)}` : "Salvo",
      cls: "text-emerald-600 dark:text-emerald-400",
    },
    error: {
      icon: <CloudOff className="h-3.5 w-3.5" />,
      text: "Erro ao salvar",
      cls: "text-destructive",
    },
  }[status];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("hidden items-center gap-1.5 text-xs md:inline-flex", map.cls)}
    >
      {map.icon}
      <span>{map.text}</span>
    </span>
  );
}
