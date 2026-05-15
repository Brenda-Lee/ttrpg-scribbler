"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

type Term = {
  id: string;
  term: string;
  definition: string;
  partOfSpeech: string;
  gender: string | null;
  treatAsProper: boolean;
  caseSensitive: boolean;
};

const POS_LABEL: Record<string, string> = {
  NOUN: "Substantivo",
  VERB: "Verbo",
  ADJ: "Adjetivo",
  ADV: "Advérbio",
  PROPER_NOUN: "Nome próprio",
  OTHER: "Outro",
};

export function GlossaryClient({
  projectId,
  initialTerms,
}: {
  projectId: string;
  initialTerms: Term[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    term: "",
    definition: "",
    partOfSpeech: "NOUN",
    gender: "",
    treatAsProper: false,
    caseSensitive: false,
  });

  async function submit() {
    const res = await fetch(`/api/glossary/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term: form.term,
        definition: form.definition,
        partOfSpeech: form.partOfSpeech,
        gender: form.gender || null,
        treatAsProper: form.treatAsProper,
        caseSensitive: form.caseSensitive,
      }),
    });
    if (!res.ok) {
      alert("Não foi possível salvar o termo.");
      return;
    }
    setOpen(false);
    setForm({
      term: "",
      definition: "",
      partOfSpeech: "NOUN",
      gender: "",
      treatAsProper: false,
      caseSensitive: false,
    });
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    if (!confirm("Remover este termo?")) return;
    await fetch(`/api/glossary/${projectId}/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-8 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Glossário</h1>
          <p className="text-sm text-muted-foreground">
            Termos do projeto. Use <kbd className="rounded bg-muted px-1 text-xs">@</kbd> no editor
            para inserir um termo na cena.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo termo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo termo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="term">Termo</Label>
                <Input
                  id="term"
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  placeholder="Ex: Glamour"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="definition">Definição</Label>
                <Textarea
                  id="definition"
                  rows={3}
                  value={form.definition}
                  onChange={(e) => setForm({ ...form, definition: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
              </div>
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending || !form.term || !form.definition}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {initialTerms.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum termo ainda.
          </div>
        ) : (
          initialTerms.map((t) => (
            <Card key={t.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{t.term}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {POS_LABEL[t.partOfSpeech] ?? t.partOfSpeech}
                    </Badge>
                    {t.gender ? (
                      <Badge variant="outline" className="text-[10px]">
                        {t.gender === "M" ? "Masc." : t.gender === "F" ? "Fem." : "Neutro"}
                      </Badge>
                    ) : null}
                    {t.treatAsProper ? (
                      <Badge variant="outline" className="text-[10px]">
                        nome próprio
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t.definition}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
