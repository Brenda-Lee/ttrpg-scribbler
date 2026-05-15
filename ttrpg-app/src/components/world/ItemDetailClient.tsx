"use client";

import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Save, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Item = {
  id: string;
  name: string;
  description: string | null;
  metaJson: string | null;
};

export function ItemDetailClient({
  projectId,
  item,
}: {
  projectId: string;
  item: Item;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? "",
    metaJson: item.metaJson ? JSON.stringify(JSON.parse(item.metaJson), null, 2) : "",
  });
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    let meta: unknown = null;
    if (form.metaJson.trim()) {
      try {
        meta = JSON.parse(form.metaJson);
      } catch {
        toast.error("Metadados não estão em JSON válido.");
        return;
      }
    }
    setPending(true);
    try {
      const res = await fetch(`/api/world/${projectId}/item/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          metaJson: meta,
        }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    await fetch(`/api/world/${projectId}/item/${item.id}`, { method: "DELETE" });
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
        <Label htmlFor="meta">Metadados (JSON livre)</Label>
        <Textarea
          id="meta"
          rows={6}
          value={form.metaJson}
          onChange={(e) => setForm({ ...form, metaJson: e.target.value })}
          placeholder='{"raridade":"lendário","peso":1.2}'
          className="font-mono text-xs"
        />
      </section>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o item "${item.name}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </div>
  );
}
