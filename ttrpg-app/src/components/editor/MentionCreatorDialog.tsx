"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { MENTION_KIND_LABEL, type MentionKind } from "@/lib/mentions";

type Props = {
  projectId: string;
  editor: Editor | null;
};

const KIND_OPTIONS: MentionKind[] = [
  "character",
  "location",
  "item",
  "lore",
  "glossary",
];

export function MentionCreatorDialog({ projectId, editor }: Props) {
  const request = useWorkspace((s) => s.mentionCreator);
  const setRequest = useWorkspace((s) => s.setMentionCreator);

  const [kind, setKind] = useState<MentionKind>("character");
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [pending, setPending] = useState(false);

  // Sempre que abre o dialog, pré-preenche com a query do popup.
  useEffect(() => {
    if (request) {
      setName(request.query);
      setExtra("");
      setKind("character");
    }
  }, [request]);

  function cancel() {
    if (pending) return;
    setRequest(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || !editor) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    try {
      const created = await createEntity(projectId, kind, trimmed, extra);
      if (!created) {
        toast.error("Não foi possível criar a entidade.");
        return;
      }
      editor
        .chain()
        .focus()
        .insertContentAt(request.range, [
          {
            type: "mention",
            attrs: { id: created.id, label: trimmed, kind },
          },
          { type: "text", text: " " },
        ])
        .run();
      toast.success(`${MENTION_KIND_LABEL[kind]}: "${trimmed}" criado.`);
      setRequest(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={!!request}
      onOpenChange={(o) => {
        if (!o) cancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar nova entidade</DialogTitle>
          <DialogDescription>
            Escolha o tipo e o nome. A entidade é criada no projeto e a menção é
            inserida no texto automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  disabled={pending}
                  className={
                    "rounded-md border px-2 py-1.5 text-xs transition-colors " +
                    (kind === k
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent")
                  }
                >
                  {MENTION_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="mc-name">
              {kind === "glossary" ? "Termo" : kind === "lore" ? "Título" : "Nome"}
            </Label>
            <Input
              id="mc-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={160}
            />
          </div>

          {kind === "glossary" ? (
            <div className="space-y-1">
              <Label htmlFor="mc-extra">Definição</Label>
              <Textarea
                id="mc-extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={3}
                required
                placeholder="O que esse termo significa neste mundo?"
              />
            </div>
          ) : null}

          {kind === "character" ||
          kind === "location" ||
          kind === "item" ||
          kind === "lore" ? (
            <div className="space-y-1">
              <Label htmlFor="mc-extra-opt">
                {kind === "character" ? "Biografia" : "Descrição"} (opcional)
              </Label>
              <Textarea
                id="mc-extra-opt"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={3}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar e inserir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function createEntity(
  projectId: string,
  kind: MentionKind,
  name: string,
  extra: string,
): Promise<{ id: string } | null> {
  try {
    if (kind === "character") {
      const res = await fetch(`/api/characters/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio: extra || null }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { id: string };
    }
    if (kind === "location") {
      const res = await fetch(`/api/world/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "location",
          name,
          description: extra || null,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { id: string };
    }
    if (kind === "item") {
      const res = await fetch(`/api/world/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "item",
          name,
          description: extra || null,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { id: string };
    }
    if (kind === "lore") {
      const res = await fetch(`/api/lore/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name, body: extra }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { id: string };
    }
    if (kind === "glossary") {
      const res = await fetch(`/api/glossary/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: name, definition: extra || name }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { id: string };
    }
  } catch {
    return null;
  }
  return null;
}
