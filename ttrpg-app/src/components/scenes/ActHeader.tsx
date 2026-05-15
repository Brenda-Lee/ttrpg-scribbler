"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { EntityKebabMenu } from "@/components/common/EntityKebabMenu";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";

export function ActHeader({
  actId,
  title,
  rightSlot,
}: {
  actId: string;
  title: string;
  rightSlot?: React.ReactNode;
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
      const res = await fetch(`/api/acts/${actId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: v }),
      });
      if (!res.ok) {
        alert("Erro ao renomear.");
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
    await fetch(`/api/acts/${actId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <header className="flex items-baseline justify-between gap-2">
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
          className="h-9 max-w-md text-xl font-semibold"
        />
      ) : (
        <h2
          className="cursor-text text-xl font-semibold tracking-tight"
          onDoubleClick={() => setEditing(true)}
        >
          {title}
        </h2>
      )}
      <div className="flex items-center gap-1">
        {rightSlot}
        <EntityKebabMenu
          onRename={() => setEditing(true)}
          onDelete={() => setConfirmOpen(true)}
        />
      </div>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o ato "${title}"?`}
        description="Todos os capítulos e cenas dentro dele também serão excluídos. Esta ação não pode ser desfeita."
        onConfirm={remove}
      />
    </header>
  );
}
