"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Option = { id: string; name: string };

type Location = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  metaJson: string | null;
};

export function LocationDetailClient({
  projectId,
  location,
  parentOptions,
  childLocations,
}: {
  projectId: string;
  location: Location;
  parentOptions: Option[];
  childLocations: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: location.name,
    description: location.description ?? "",
    parentId: location.parentId ?? "",
    metaJson: location.metaJson
      ? JSON.stringify(JSON.parse(location.metaJson), null, 2)
      : "",
  });
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    let meta: unknown = null;
    if (form.metaJson.trim()) {
      try {
        meta = JSON.parse(form.metaJson);
      } catch {
        alert("Metadados não estão em JSON válido.");
        return;
      }
    }
    setPending(true);
    try {
      const res = await fetch(`/api/world/${projectId}/location/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          parentId: form.parentId || null,
          metaJson: meta,
        }),
      });
      if (!res.ok) {
        alert("Erro ao salvar.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    await fetch(`/api/world/${projectId}/location/${location.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/world`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${projectId}/world`}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex items-center gap-4">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="h-10 flex-1 text-xl font-semibold"
        />
        <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button onClick={save} disabled={pending}>
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </header>

      <section className="space-y-2">
        <Label htmlFor="desc">Descrição</Label>
        <Textarea
          id="desc"
          rows={6}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </section>

      <section className="space-y-2">
        <Label>Local pai</Label>
        <select
          value={form.parentId}
          onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">— (sem hierarquia)</option>
          {parentOptions
            .filter((p) => p.id !== location.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </section>

      <section className="space-y-2">
        <Label htmlFor="meta">Metadados (JSON livre)</Label>
        <Textarea
          id="meta"
          rows={6}
          value={form.metaJson}
          onChange={(e) => setForm({ ...form, metaJson: e.target.value })}
          placeholder='{"clima":"frio","tamanho":"grande","estacao":"inverno"}'
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Sugestões: clima, tamanho, estação, prédios, árvores, pontos de referência.
        </p>
      </section>

      {childLocations.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Locais filhos ({childLocations.length})
          </h3>
          <ul className="space-y-1">
            {childLocations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/projects/${projectId}/world/locations/${c.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o local "${location.name}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </div>
  );
}
