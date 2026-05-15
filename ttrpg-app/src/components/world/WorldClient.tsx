"use client";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Package, Plus, Scroll } from "lucide-react";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import {
  LORE_CATEGORIES,
  LORE_CATEGORY_COLOR,
  LORE_CATEGORY_LABEL,
  type LoreCategory,
} from "@/lib/lore";
import { cn } from "@/lib/utils";

type Entity = { id: string; name: string; description: string | null };
type LoreEntry = { id: string; title: string; category: string; excerpt: string | null };

export function WorldClient({
  projectId,
  locations,
  items,
  lore,
}: {
  projectId: string;
  locations: Entity[];
  items: Entity[];
  lore: LoreEntry[];
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-8 py-8">
      <Section
        projectId={projectId}
        title="Locais"
        kind="location"
        icon={MapPin}
        entities={locations}
      />
      <Section
        projectId={projectId}
        title="Itens"
        kind="item"
        icon={Package}
        entities={items}
      />
      <LoreSection projectId={projectId} entries={lore} />
    </div>
  );
}

function Section({
  projectId,
  title,
  kind,
  icon: Icon,
  entities,
}: {
  projectId: string;
  title: string;
  kind: "location" | "item";
  icon: React.ComponentType<{ className?: string }>;
  entities: Entity[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const basePath =
    kind === "location"
      ? `/projects/${projectId}/world/locations`
      : `/projects/${projectId}/world/items`;

  async function submit() {
    if (!name.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/world/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: name.trim(), description: desc || null }),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar.");
        return;
      }
      setOpen(false);
      setName("");
      setDesc("");
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/world/${projectId}/${kind}/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Icon className="h-5 w-5 text-muted-foreground" /> {title}
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo {title.toLowerCase().slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending || !name.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entities.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nada ainda.
          </div>
        ) : (
          entities.map((e) => (
            <Card
              key={e.id}
              id={`${kind}-${e.id}`}
              className="group relative space-y-1 p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <Link
                href={`${basePath}/${e.id}`}
                className="absolute inset-0 z-0"
                aria-label={`Abrir ${e.name}`}
              />
              <div className="relative z-10 flex items-start justify-between">
                <h3 className="font-medium">{e.name}</h3>
                <EntityKebabMenu
                  stopPropagation
                  onDelete={() => setDeleteTarget(e)}
                />
              </div>
              {e.description ? (
                <p className="relative z-10 text-sm text-muted-foreground">{e.description}</p>
              ) : null}
            </Card>
          ))
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget ? `Excluir "${deleteTarget.name}"?` : ""}
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget.id);
        }}
      />
    </section>
  );
}

function LoreSection({
  projectId,
  entries,
}: {
  projectId: string;
  entries: LoreEntry[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LoreEntry | null>(null);
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

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Scroll className="h-5 w-5 text-muted-foreground" /> Lore
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova entrada de lore</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="lore-title">Título</Label>
                <Input
                  id="lore-title"
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
                <Label htmlFor="lore-excerpt">Resumo (opcional)</Label>
                <Textarea
                  id="lore-excerpt"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nada ainda.
          </div>
        ) : (
          entries.map((l) => {
            const cat = (LORE_CATEGORIES as readonly string[]).includes(l.category)
              ? (l.category as LoreCategory)
              : "OTHER";
            return (
              <Card
                key={l.id}
                className="group relative space-y-2 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <Link
                  href={`/projects/${projectId}/world/lore/${l.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`Abrir ${l.title}`}
                />
                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium leading-tight">{l.title}</h3>
                    <Badge
                      variant="secondary"
                      className={cn("mt-1 text-[10px]", LORE_CATEGORY_COLOR[cat])}
                    >
                      {LORE_CATEGORY_LABEL[cat]}
                    </Badge>
                  </div>
                  <EntityKebabMenu stopPropagation onDelete={() => setDeleteTarget(l)} />
                </div>
                {l.excerpt ? (
                  <p className="relative z-10 line-clamp-3 text-sm text-muted-foreground">
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
    </section>
  );
}
