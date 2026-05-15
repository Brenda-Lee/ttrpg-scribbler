"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

export function ChapterHeader({
  chapterId,
  title,
}: {
  chapterId: string;
  title: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    const v = value.trim();
    if (!v || v === title) {
      setEditing(false);
      setValue(title);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: v }),
      });
      if (!res.ok) {
        toast.error("Erro ao renomear.");
        setValue(title);
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    await fetch(`/api/chapters/${chapterId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-start justify-between gap-2">
      {editing ? (
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(title);
            }
          }}
          onBlur={save}
          disabled={pending}
          className="h-7 text-sm font-semibold"
        />
      ) : (
        <h3
          className="cursor-text text-sm font-semibold leading-tight"
          onDoubleClick={() => setEditing(true)}
        >
          {title}
        </h3>
      )}
      <EntityKebabMenu
        onRename={() => setEditing(true)}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o capítulo "${title}"?`}
        description="Todas as cenas dentro dele também serão excluídas. Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </div>
  );
}
