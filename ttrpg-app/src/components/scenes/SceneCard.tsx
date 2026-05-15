"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Props = {
  projectId: string;
  sceneId: string;
  title: string;
  snippet: string;
  status: string;
  wordCount: number;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  REVISING: "Revisão",
  DONE: "Pronto",
};

export function SceneCard({ projectId, sceneId, title, snippet, status, wordCount }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function rename() {
    const v = value.trim();
    if (!v || v === title) {
      setEditing(false);
      setValue(title);
      return;
    }
    const res = await fetch(`/api/scenes/${sceneId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: v }),
    });
    if (!res.ok) {
      alert("Erro ao renomear.");
      setValue(title);
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  async function remove() {
    await fetch(`/api/scenes/${sceneId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <Card className="group p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") {
                  setEditing(false);
                  setValue(title);
                }
              }}
              onBlur={rename}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm font-medium"
            />
          ) : (
            <Link
              href={`/projects/${projectId}/write/${sceneId}`}
              className="flex flex-1 items-center gap-1.5 text-sm font-medium leading-tight"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {title}
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] font-normal">
              {statusLabel[status] ?? status}
            </Badge>
            <EntityKebabMenu
              stopPropagation
              onRename={() => setEditing(true)}
              onDelete={() => setConfirmOpen(true)}
            />
          </div>
        </div>
        <Link
          href={`/projects/${projectId}/write/${sceneId}`}
          className="mt-1.5 block"
          tabIndex={-1}
        >
          {snippet ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{snippet}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">(cena vazia)</p>
          )}
          <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {wordCount} palavras
          </p>
        </Link>
      </Card>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir a cena "${title}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </>
  );
}
