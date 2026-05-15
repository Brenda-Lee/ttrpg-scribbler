"use client";

import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Save, Trash2 } from "lucide-react";
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
  body: string;
  metaJson: string | null;
};

export function LoreDetailClient({
  projectId,
  lore,
}: {
  projectId: string;
  lore: Lore;
}) {
  const router = useRouter();
  const initialCategory: LoreCategory = (LORE_CATEGORIES as readonly string[]).includes(
    lore.category,
  )
    ? (lore.category as LoreCategory)
    : "OTHER";
  const [form, setForm] = useState({
    title: lore.title,
    category: initialCategory,
    excerpt: lore.excerpt ?? "",
    body: lore.body,
    metaJson: lore.metaJson ? JSON.stringify(JSON.parse(lore.metaJson), null, 2) : "",
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
      const res = await fetch(`/api/lore/${projectId}/${lore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          excerpt: form.excerpt || null,
          body: form.body,
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
    await fetch(`/api/lore/${projectId}/${lore.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/world`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${projectId}/world`}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-4">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-10 flex-1 text-xl font-semibold"
          />
          <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={save} disabled={pending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
        <Badge variant="secondary" className={cn("text-[10px]", LORE_CATEGORY_COLOR[form.category])}>
          {LORE_CATEGORY_LABEL[form.category]}
        </Badge>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </section>

      <section className="space-y-2">
        <Label htmlFor="excerpt">Resumo</Label>
        <Textarea
          id="excerpt"
          rows={3}
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          placeholder="Frase curta que aparece no card."
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="body">Conteúdo</Label>
        <Textarea
          id="body"
          rows={14}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Descreva a religião / festival / cerimônia / aspecto cultural..."
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="meta">Metadados (JSON livre)</Label>
        <Textarea
          id="meta"
          rows={4}
          value={form.metaJson}
          onChange={(e) => setForm({ ...form, metaJson: e.target.value })}
          placeholder='{"frequencia":"anual","regiao":"Valoran"}'
          className="font-mono text-xs"
        />
      </section>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir "${lore.title}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </div>
  );
}
