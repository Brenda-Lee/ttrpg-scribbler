"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  placeholder: string;
  label: string;
};

export function StructureActions({ action, hidden, placeholder, label }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(hidden)) fd.set(k, v);
    fd.set("title", value.trim());
    startTransition(async () => {
      await action(fd);
      setValue("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1 text-xs text-muted-foreground"
      >
        <Plus className="h-3 w-3" /> {label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setValue("");
          }
        }}
        className="h-7 text-xs"
      />
      <Button size="sm" className="h-7" disabled={pending} onClick={submit}>
        {pending ? "..." : "OK"}
      </Button>
    </div>
  );
}
