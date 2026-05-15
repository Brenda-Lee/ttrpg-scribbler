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

type Option = { id: string; name: string };

type Term = {
  id: string;
  term: string;
  definition: string;
  partOfSpeech: string;
  gender: string | null;
  treatAsProper: boolean;
  caseSensitive: boolean;
  conjugationJson: string | null;
  relatedCharacterId: string | null;
  relatedLocationId: string | null;
  relatedItemId: string | null;
};

const POS_LABEL: Record<string, string> = {
  NOUN: "Substantivo",
  VERB: "Verbo",
  ADJ: "Adjetivo",
  ADV: "Advérbio",
  PROPER_NOUN: "Nome próprio",
  OTHER: "Outro",
};

export function GlossaryDetailClient({
  projectId,
  term,
  characters,
  locations,
  items,
  appearances,
}: {
  projectId: string;
  term: Term;
  characters: Option[];
  locations: Option[];
  items: Option[];
  appearances: Array<{ id: string; title: string; chapterTitle: string; actTitle: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    term: term.term,
    definition: term.definition,
    partOfSpeech: term.partOfSpeech,
    gender: term.gender ?? "",
    treatAsProper: term.treatAsProper,
    caseSensitive: term.caseSensitive,
    conjugationJson: term.conjugationJson
      ? JSON.stringify(JSON.parse(term.conjugationJson), null, 2)
      : "",
    relatedCharacterId: term.relatedCharacterId ?? "",
    relatedLocationId: term.relatedLocationId ?? "",
    relatedItemId: term.relatedItemId ?? "",
  });
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    let conj: unknown = null;
    if (form.conjugationJson.trim()) {
      try {
        conj = JSON.parse(form.conjugationJson);
      } catch {
        toast.error("Conjugação não está em JSON válido.");
        return;
      }
    }
    setPending(true);
    try {
      const res = await fetch(`/api/glossary/${projectId}/${term.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: form.term,
          definition: form.definition,
          partOfSpeech: form.partOfSpeech,
          gender: form.gender || null,
          treatAsProper: form.treatAsProper,
          caseSensitive: form.caseSensitive,
          conjugationJson: conj,
          relatedCharacterId: form.relatedCharacterId || null,
          relatedLocationId: form.relatedLocationId || null,
          relatedItemId: form.relatedItemId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error === "duplicate_slug" ? "Já existe um termo com esse nome." : "Erro ao salvar.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    await fetch(`/api/glossary/${projectId}/${term.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/glossary`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${projectId}/glossary`}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <Input
            value={form.term}
            onChange={(e) => setForm({ ...form, term: e.target.value })}
            className="h-10 text-xl font-semibold"
          />
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {POS_LABEL[form.partOfSpeech] ?? form.partOfSpeech}
            </Badge>
            {form.gender ? (
              <Badge variant="outline" className="text-[10px]">
                {form.gender === "M" ? "Masc." : form.gender === "F" ? "Fem." : "Neutro"}
              </Badge>
            ) : null}
            {form.treatAsProper ? (
              <Badge variant="outline" className="text-[10px]">
                nome próprio
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={save} disabled={pending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </header>

      <section className="space-y-2">
        <Label htmlFor="def">Definição</Label>
        <Textarea
          id="def"
          rows={5}
          value={form.definition}
          onChange={(e) => setForm({ ...form, definition: e.target.value })}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Classe gramatical</Label>
          <select
            value={form.partOfSpeech}
            onChange={(e) => setForm({ ...form, partOfSpeech: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {Object.entries(POS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Gênero</Label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="N">Neutro</option>
          </select>
        </div>
      </section>

      <section className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.treatAsProper}
            onChange={(e) => setForm({ ...form, treatAsProper: e.target.checked })}
          />
          Tratar como nome próprio
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.caseSensitive}
            onChange={(e) => setForm({ ...form, caseSensitive: e.target.checked })}
          />
          Distinguir maiúsculas/minúsculas
        </label>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LinkSelect
          label="Personagem"
          value={form.relatedCharacterId}
          options={characters}
          onChange={(v) => setForm({ ...form, relatedCharacterId: v })}
        />
        <LinkSelect
          label="Local"
          value={form.relatedLocationId}
          options={locations}
          onChange={(v) => setForm({ ...form, relatedLocationId: v })}
        />
        <LinkSelect
          label="Item"
          value={form.relatedItemId}
          options={items}
          onChange={(v) => setForm({ ...form, relatedItemId: v })}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="conj">Conjugações / formas (JSON livre)</Label>
        <Textarea
          id="conj"
          rows={4}
          value={form.conjugationJson}
          onChange={(e) => setForm({ ...form, conjugationJson: e.target.value })}
          placeholder='{"singular":"glamour","plural":"glamours"}'
          className="font-mono text-xs"
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Aparições no texto ({appearances.length})
        </h3>
        {appearances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este termo ainda não foi usado em nenhuma cena.</p>
        ) : (
          <ul className="space-y-1">
            {appearances.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/projects/${projectId}/write/${a.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {a.actTitle} · {a.chapterTitle} · {a.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o termo "${term.term}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </div>
  );
}

function LinkSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
