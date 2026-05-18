"use client";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Scroll } from "lucide-react";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import {
  LORE_CATEGORIES,
  LORE_CATEGORY_COLOR,
  LORE_CATEGORY_LABEL,
  type LoreCategory,
} from "@/lib/lore";
import { cn } from "@/lib/utils";

type Lore = {
  id: string;
  title: string;
  category: string;
  excerpt: string | null;
};

export function LoreClient({
  projectId,
  initialLore,
}: {
  projectId: string;
  initialLore: Lore[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lore | null>(null);
  const [filter, setFilter] = useState<"" | LoreCategory>("");
  const [form, setForm] = useState({
    title: "",
    category: "RELIGION" as LoreCategory,
    excerpt: "",
  });

  async function submit() {
    if (!form.title.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/lore/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          excerpt: form.excerpt.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar.");
        return;
      }
      setOpen(false);
      setForm({ title: "", category: "RELIGION", excerpt: "" });
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/lore/${projectId}/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const filtered = filter ? initialLore.filter((l) => l.category === filter) : initialLore;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-8 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Scroll className="h-6 w-6 text-muted-foreground" />
            Lore
          </h1>
          <p className="text-sm text-muted-foreground">
            Detalhes culturais e sociais do mundo: religiões, festivais, cerimônias e mais.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo lore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova entrada de lore</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Culto do Véu"
                />
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as LoreCategory })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {LORE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {LORE_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="excerpt">Resumo (opcional)</Label>
                <Textarea
                  id="excerpt"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="Frase curta que aparece no card."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending || !form.title.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip active={filter === ""} onClick={() => setFilter("")}>
          Todos ({initialLore.length})
        </CategoryChip>
        {LORE_CATEGORIES.map((c) => {
          const count = initialLore.filter((l) => l.category === c).length;
          if (count === 0) return null;
          return (
            <CategoryChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {LORE_CATEGORY_LABEL[c]} ({count})
            </CategoryChip>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhuma entrada nesta categoria.
          </div>
        ) : (
          filtered.map((l) => {
            const cat = (LORE_CATEGORIES as readonly string[]).includes(l.category)
              ? (l.category as LoreCategory)
              : "OTHER";
            return (
              <Card
                key={l.id}
                className="group relative space-y-2 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <Link
                  href={`/projects/${projectId}/lore/${l.id}`}
                  className="absolute inset-0"
                  aria-label={`Abrir ${l.title}`}
                />
                <div className="pointer-events-none relative flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium leading-tight">{l.title}</h3>
                    <Badge
                      variant="secondary"
                      className={cn("mt-1 text-[10px]", LORE_CATEGORY_COLOR[cat])}
                    >
                      {LORE_CATEGORY_LABEL[cat]}
                    </Badge>
                  </div>
                  <div className="pointer-events-auto shrink-0">
                    <EntityKebabMenu stopPropagation onDelete={() => setDeleteTarget(l)} />
                  </div>
                </div>
                {l.excerpt ? (
                  <p className="pointer-events-none relative line-clamp-3 text-sm text-muted-foreground">
                    {l.excerpt}
                  </p>
                ) : null}
              </Card>
            );
          })
        )}
      </div>

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

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
