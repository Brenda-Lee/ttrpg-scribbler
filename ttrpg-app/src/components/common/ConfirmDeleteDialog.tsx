"use client";

import { useState, type ReactNode } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Se definido, o usuário precisa digitar exatamente este texto para liberar a confirmação. */
  confirmWord?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel = "Excluir",
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const ready = !confirmWord || typed === confirmWord;

  async function handleConfirm() {
    if (!ready || pending) return;
    setPending(true);
    try {
      await onConfirm();
      setTyped("");
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {confirmWord ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              Para confirmar, digite{" "}
              <span className="font-mono font-semibold">{confirmWord}</span>
            </Label>
            <Input
              id="confirm-input"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!ready || pending}>
            {pending ? "Excluindo..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
