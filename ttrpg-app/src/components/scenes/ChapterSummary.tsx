"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export function ChapterSummary({
  chapterId,
  summary,
}: {
  chapterId: string;
  summary: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(summary ?? "");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: value.trim() || null }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar sumário.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="O que acontece neste capítulo?"
          className="text-xs"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setValue(summary ?? "");
            }
          }}
        />
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setEditing(false);
              setValue(summary ?? "");
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={save}
            disabled={pending}
          >
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <p
        className="group cursor-text text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        {summary}
        <Pencil className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-xs italic text-muted-foreground/70 hover:text-foreground"
    >
      <Pencil className="h-3 w-3" /> Adicionar sumário
    </button>
  );
}
