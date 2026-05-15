"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Plus, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  dateLabel: string;
  sortOrder: number;
  color: string;
};

const DEFAULT_COLORS = [
  "#94a3b8", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#ec4899", "#0891b2",
];

export function TimelineClient({
  projectId,
  initialEvents,
}: {
  projectId: string;
  initialEvents: EventItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dateLabel: "",
    color: DEFAULT_COLORS[0],
  });

  function openCreate() {
    setEditing(null);
    setForm({ title: "", description: "", dateLabel: "", color: DEFAULT_COLORS[0] });
    setOpen(true);
  }

  function openEdit(ev: EventItem) {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      dateLabel: ev.dateLabel,
      color: ev.color,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) return;
    setPending(true);
    try {
      const url = editing
        ? `/api/events/${projectId}/${editing.id}`
        : `/api/events/${projectId}`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          dateLabel: form.dateLabel.trim(),
          color: form.color,
        }),
      });
      if (!res.ok) {
        alert("Erro ao salvar.");
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/events/${projectId}/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  async function move(ev: EventItem, direction: -1 | 1) {
    const sorted = [...initialEvents].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((e) => e.id === ev.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      fetch(`/api/events/${projectId}/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: other.sortOrder }),
      }),
      fetch(`/api/events/${projectId}/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: ev.sortOrder }),
      }),
    ]);
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Clock className="h-6 w-6 text-muted-foreground" />
            Linha do tempo
          </h1>
          <p className="text-sm text-muted-foreground">
            Eventos importantes do projeto, ordenados cronologicamente.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Queda da Coroa Velha"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateLabel">Data (texto livre)</Label>
                <Input
                  id="dateLabel"
                  value={form.dateLabel}
                  onChange={(e) => setForm({ ...form, dateLabel: e.target.value })}
                  placeholder="Ex: Inverno do ano 312, Era pré-Cataclismo"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      onClick={() => setForm({ ...form, color: c })}
                      className={
                        "h-7 w-7 rounded-full border-2 transition-transform " +
                        (form.color === c
                          ? "scale-110 border-foreground"
                          : "border-transparent")
                      }
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending || !form.title.trim()}>
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {initialEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Sem eventos ainda. Crie o primeiro para começar.
        </div>
      ) : (
        <div className="relative space-y-3 pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {initialEvents.map((ev, idx) => (
            <Card
              key={ev.id}
              className="relative ml-4 space-y-2 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <span
                className="absolute -left-6 top-5 h-3 w-3 rounded-full ring-2 ring-background"
                style={{ backgroundColor: ev.color }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {ev.dateLabel ? (
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {ev.dateLabel}
                    </p>
                  ) : null}
                  <h3 className="font-medium">{ev.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(ev, -1)}
                    disabled={idx === 0}
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(ev, 1)}
                    disabled={idx === initialEvents.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(ev)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteTarget(ev)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {ev.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ev.description}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget ? `Excluir "${deleteTarget.title}"?` : ""}
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget.id);
        }}
      />
    </div>
  );
}
