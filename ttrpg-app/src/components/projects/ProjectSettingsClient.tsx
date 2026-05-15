"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Archive, ArchiveRestore, Save, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Project = {
  id: string;
  title: string;
  summary: string | null;
  systemId: string | null;
  status: string;
};

type System = { id: string; name: string };

export function ProjectSettingsClient({
  project,
  systems,
}: {
  project: Project;
  systems: System[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: project.title,
    summary: project.summary ?? "",
    systemId: project.systemId ?? "",
  });
  const [status, setStatus] = useState(project.status);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    setPending(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          summary: form.summary || null,
          systemId: form.systemId || null,
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

  async function toggleArchive() {
    const next = status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    setPending(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        alert("Erro ao alterar status.");
        return;
      }
      setStatus(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function moveToTrash() {
    setPending(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TRASHED" }),
      });
      if (!res.ok) {
        alert("Erro ao mover para lixeira.");
        return;
      }
      router.push("/projects?status=trash");
    } finally {
      setPending(false);
    }
  }

  async function hardDelete() {
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Erro ao excluir.");
      return;
    }
    router.push("/projects");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${project.id}/write`}>
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações do projeto</h1>
          <div className="mt-1">
            <Badge variant={status === "ACTIVE" ? "secondary" : "outline"}>
              {status === "ACTIVE"
                ? "Ativo"
                : status === "ARCHIVED"
                  ? "Arquivado"
                  : "Excluído"}
            </Badge>
          </div>
        </div>
        <Button onClick={save} disabled={pending}>
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </header>

      <section className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="summary">Resumo</Label>
          <Textarea
            id="summary"
            rows={4}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="systemId">Sistema</Label>
          <select
            id="systemId"
            value={form.systemId}
            onChange={(e) => setForm({ ...form, systemId: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Sem sistema</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Status</h2>
        <p className="text-xs text-muted-foreground">
          Projetos arquivados continuam acessíveis em <em>“Arquivados”</em> na listagem, mas saem
          da lista padrão.
        </p>
        <Button variant="outline" onClick={toggleArchive} disabled={pending}>
          {status === "ACTIVE" ? (
            <>
              <Archive className="h-4 w-4" /> Arquivar
            </>
          ) : (
            <>
              <ArchiveRestore className="h-4 w-4" /> Reativar
            </>
          )}
        </Button>
      </section>

      <section className="space-y-2 rounded-lg border border-destructive/40 p-4">
        <h2 className="text-sm font-semibold text-destructive">Zona de perigo</h2>
        <p className="text-xs text-muted-foreground">
          A lixeira mantém o projeto recuperável até que você o exclua definitivamente. Excluir
          definitivamente apaga tudo dentro dele (atos, capítulos, cenas, personagens, glossário,
          locais, itens e lore) sem volta.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={moveToTrash} disabled={pending || status === "TRASHED"}>
            <Trash2 className="h-4 w-4" /> Mover para lixeira
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> Excluir definitivamente
          </Button>
        </div>
      </section>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir projeto definitivamente?"
        description="Esta ação não pode ser desfeita."
        confirmWord={project.title}
        confirmLabel="Excluir tudo"
        onConfirm={hardDelete}
      />
    </div>
  );
}
