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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Package, Plus, Trash2 } from "lucide-react";

type Entity = { id: string; name: string; description: string | null };

export function WorldClient({
  projectId,
  locations,
  items,
}: {
  projectId: string;
  locations: Entity[];
  items: Entity[];
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-8 py-8">
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
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  async function submit() {
    if (!name.trim()) return;
    const res = await fetch(`/api/world/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: name.trim(), description: desc || null }),
    });
    if (!res.ok) {
      alert("Não foi possível salvar.");
      return;
    }
    setOpen(false);
    setName("");
    setDesc("");
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Remover?")) return;
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
            <Card key={e.id} id={`${kind}-${e.id}`} className="space-y-1 p-3">
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{e.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => remove(e.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {e.description ? (
                <p className="text-sm text-muted-foreground">{e.description}</p>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
