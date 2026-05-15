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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { initials } from "@/lib/utils";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Character = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  PC: "Personagem",
  NPC: "NPC",
  VILLAIN: "Vilão",
  MONSTER: "Monstro",
};

export function CharactersClient({
  projectId,
  initialCharacters,
}: {
  projectId: string;
  initialCharacters: Character[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [form, setForm] = useState({ name: "", role: "NPC", bio: "" });

  async function remove(id: string) {
    await fetch(`/api/characters/${projectId}/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  async function submit() {
    const res = await fetch(`/api/characters/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        role: form.role,
        bio: form.bio || null,
      }),
    });
    if (!res.ok) {
      toast.error("Não foi possível salvar o personagem.");
      return;
    }
    setOpen(false);
    setForm({ name: "", role: "NPC", bio: "" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-8 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Personagens</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo personagem
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo personagem</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Papel</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {Object.entries(ROLE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending || !form.name}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {initialCharacters.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum personagem ainda.
          </div>
        ) : (
          initialCharacters.map((c) => (
            <Card
              key={c.id}
              className="group relative flex h-full items-start gap-3 p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <Link
                href={`/projects/${projectId}/characters/${c.id}`}
                className="absolute inset-0 z-0"
                aria-label={`Abrir ${c.name}`}
              />
              <Avatar className="relative z-10 h-12 w-12">
                <AvatarFallback>{initials(c.name)}</AvatarFallback>
              </Avatar>
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-medium">{c.name}</h3>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABEL[c.role] ?? c.role}
                    </Badge>
                    <EntityKebabMenu
                      stopPropagation
                      onDelete={() => setDeleteTarget(c)}
                    />
                  </div>
                </div>
                {c.bio ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>
                ) : null}
              </div>
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
    </div>
  );
}
