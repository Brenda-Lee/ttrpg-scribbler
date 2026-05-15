"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Trash2, RotateCcw } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

type Props = {
  id: string;
  title: string;
  summary: string | null;
  systemName: string | null;
  sceneCount: number;
  characterCount: number;
};

export function TrashedProjectCard({
  id,
  title,
  summary,
  systemName,
  sceneCount,
  characterCount,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function restore() {
    setPending(true);
    try {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function purge() {
    setPending(true);
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="h-full opacity-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Excluído
          </Badge>
        </div>
        {summary ? <CardDescription className="line-clamp-3">{summary}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{systemName ?? "Sem sistema"}</span>
          <span>
            {sceneCount} cenas · {characterCount} personagens
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={restore}
            disabled={pending}
            className="flex-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            className="flex-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir definitivamente
          </Button>
        </div>
      </CardContent>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir "${title}" permanentemente?`}
        description="Todos os dados serão apagados. Esta ação não pode ser desfeita."
        confirmWord={title}
        onConfirm={purge}
      />
    </Card>
  );
}
