"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/stores/workspace";
import { History, RotateCcw, Save, Loader2 } from "lucide-react";

type Revision = {
  id: string;
  kind: "AUTO" | "MANUAL";
  label: string | null;
  wordCount: number;
  createdAt: string;
};

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function RevisionHistoryPanel() {
  const sceneId = useWorkspace((s) => s.currentSceneId);
  const historyBump = useWorkspace((s) => s.historyBump);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);

  const load = useCallback(async () => {
    if (!sceneId) {
      setRevisions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/scenes/${sceneId}/revisions`);
      if (!res.ok) return;
      const data = (await res.json()) as { revisions: Revision[] };
      setRevisions(data.revisions);
    } finally {
      setLoading(false);
    }
  }, [sceneId]);

  useEffect(() => {
    load();
  }, [load, historyBump]);

  if (!sceneId) return null;

  return (
    <section className="mt-6 border-t pt-4">
      <header className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Histórico
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setManualOpen(true)}
        >
          <Save className="h-3 w-3" /> Salvar versão
        </Button>
      </header>

      {loading && revisions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : revisions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma revisão ainda. A cada poucos minutos de edição uma versão será salva
          automaticamente.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {revisions.map((r) => (
            <li
              key={r.id}
              className="group flex items-start justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={r.kind === "MANUAL" ? "default" : "secondary"}
                    className="text-[9px] uppercase"
                  >
                    {r.kind === "MANUAL" ? "Manual" : "Auto"}
                  </Badge>
                  <span className="truncate text-xs text-foreground">
                    {r.label ?? dateFmt.format(new Date(r.createdAt))}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {r.label ? dateFmt.format(new Date(r.createdAt)) + " · " : ""}
                  {r.wordCount} palavra{r.wordCount === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-60 group-hover:opacity-100"
                aria-label="Restaurar esta versão"
                onClick={() => setRestoreTarget(r)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <SaveVersionDialog
        sceneId={sceneId}
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSaved={load}
      />
      <RestoreDialog
        sceneId={sceneId}
        revision={restoreTarget}
        onOpenChange={(v) => !v && setRestoreTarget(null)}
        onRestored={load}
      />
    </section>
  );
}

function SaveVersionDialog({
  sceneId,
  open,
  onOpenChange,
  onSaved,
}: {
  sceneId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      const res = await fetch(`/api/scenes/${sceneId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar a versão.");
        return;
      }
      toast.success("Versão salva.");
      setLabel("");
      onOpenChange(false);
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar versão da cena</DialogTitle>
          <DialogDescription>
            Cria um snapshot manual do conteúdo atual. Você poderá restaurá-lo depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rev-label">Rótulo (opcional)</Label>
          <Input
            id="rev-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: depois da revisão do orientador"
            maxLength={120}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({
  sceneId,
  revision,
  onOpenChange,
  onRestored,
}: {
  sceneId: string;
  revision: Revision | null;
  onOpenChange: (o: boolean) => void;
  onRestored: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!revision) return;
    setPending(true);
    try {
      const res = await fetch(
        `/api/scenes/${sceneId}/revisions/${revision.id}/restore`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Não foi possível restaurar a versão.");
        return;
      }
      toast.success(
        "Versão restaurada. O conteúdo atual foi salvo como nova revisão antes da troca.",
      );
      onOpenChange(false);
      onRestored();
      // Atualiza o editor: a página de cena re-renderiza ao receber router.refresh,
      // mas como o Tiptap inicial vem do servidor, recarregamos a rota.
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!revision} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restaurar versão?</DialogTitle>
          <DialogDescription>
            O conteúdo atual da cena será substituído pelo desta versão. Antes disso, uma
            nova revisão MANUAL será criada com o conteúdo atual, então nada será perdido.
          </DialogDescription>
        </DialogHeader>
        {revision ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <strong>
              {revision.label ?? dateFmt.format(new Date(revision.createdAt))}
            </strong>
            <p className="text-muted-foreground">
              {revision.wordCount} palavras · {revision.kind === "MANUAL" ? "Manual" : "Auto"}
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
