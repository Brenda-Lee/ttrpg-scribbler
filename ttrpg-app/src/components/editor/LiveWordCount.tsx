"use client";

import { useWorkspace } from "@/stores/workspace";
import { wordCountOf } from "@/lib/utils";

/**
 * Contador de palavras da cena ativa em tempo real.
 * Lê o `currentText` do store (atualizado a cada keystroke pelo TiptapEditor)
 * e calcula a contagem no cliente sem esperar o autosave.
 *
 * Antes do editor montar (ou em rotas que não têm editor) usa `initial` como fallback.
 */
export function LiveWordCount({ initial }: { initial: number }) {
  const text = useWorkspace((s) => s.currentText);
  const count = text === null ? initial : wordCountOf(text);
  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {count} palavra{count === 1 ? "" : "s"}
    </span>
  );
}
