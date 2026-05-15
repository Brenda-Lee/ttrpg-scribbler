"use client";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Save, Trash2 } from "lucide-react";
import { initials } from "@/lib/utils";
import { BodyMap } from "./BodyMap";

type Character = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  attributesJson: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  PC: "Personagem",
  NPC: "NPC",
  VILLAIN: "Vilão",
  MONSTER: "Monstro",
};

export function CharacterDetailClient({
  projectId,
  character,
}: {
  projectId: string;
  character: Character;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role);
  const [bio, setBio] = useState(character.bio ?? "");
  const [attrsText, setAttrsText] = useState(
    character.attributesJson
      ? JSON.stringify(JSON.parse(character.attributesJson), null, 2)
      : "{}",
  );

  async function save() {
    let attrs: unknown;
    try {
      attrs = JSON.parse(attrsText || "{}");
    } catch {
      toast.error("Atributos não estão em JSON válido.");
      return;
    }
    const res = await fetch(`/api/characters/${projectId}/${character.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, bio: bio || null, attributesJson: attrs }),
    });
    if (!res.ok) {
      toast.error("Não foi possível salvar.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function remove() {
    if (!confirm("Remover este personagem?")) return;
    await fetch(`/api/characters/${projectId}/${character.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}/characters`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${projectId}/characters`}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials(name || "?")}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 text-xl font-semibold"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={remove}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={save} disabled={pending}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </header>

      <section className="space-y-2">
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          rows={6}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="attrs">Atributos (JSON livre)</Label>
        <Textarea
          id="attrs"
          rows={8}
          value={attrsText}
          onChange={(e) => setAttrsText(e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Estrutura livre — chaves arbitrárias dependendo do sistema (classe, raça, atributos,
          afiliação, etc).
        </p>
      </section>

      <BodyMap projectId={projectId} characterId={character.id} />
    </div>
  );
}
