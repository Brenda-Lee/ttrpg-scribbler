"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Music, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Asset = {
  id: string;
  kind: "IMAGE" | "AUDIO";
  path: string;
  mime: string;
  sizeBytes: number;
};

export function MediaInsertDialog({
  open,
  onOpenChange,
  projectId,
  editor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  editor: Editor | null;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${projectId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { assets: Asset[] };
      setAssets(data.assets);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function insert(asset: Asset) {
    if (!editor) return;
    if (asset.kind === "IMAGE") {
      editor.chain().focus().setImage({ src: asset.path }).run();
    } else {
      editor.chain().focus().setAudio({ src: asset.path }).run();
    }
    onOpenChange(false);
  }

  async function uploadAndInsert(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      fd.append("kind", file.type.startsWith("audio/") ? "audio" : "image");
      const res = await fetch(`/api/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const code = err?.error;
        if (code === "unsupported_type") {
          toast.error("Tipo de arquivo não suportado.");
        } else if (code === "too_large") {
          toast.error("Arquivo grande demais (imagem ≤5MB, áudio ≤15MB).");
        } else {
          toast.error("Falha no upload.");
        }
        return;
      }
      const data = (await res.json()) as { path: string; assetId: string | null };
      if (!editor) return;
      if (file.type.startsWith("audio/")) {
        editor.chain().focus().setAudio({ src: data.path }).run();
      } else {
        editor.chain().focus().setImage({ src: data.path }).run();
      }
      await load();
      onOpenChange(false);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inserir mídia</DialogTitle>
          <DialogDescription>
            Selecione uma mídia já carregada ou envie uma nova (imagens até 5 MB; áudio até
            15 MB).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/ogg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndInsert(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Enviar novo arquivo
          </Button>
          <span className="text-xs text-muted-foreground">
            {assets.length} item{assets.length === 1 ? "" : "s"} no projeto
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : assets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma mídia ainda. Envie um arquivo acima.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => insert(a)}
                  className={cn(
                    "group flex flex-col gap-1 rounded-md border p-2 text-left hover:border-primary",
                  )}
                >
                  {a.kind === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.path}
                      alt=""
                      className="aspect-video w-full rounded object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded bg-muted">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {a.kind === "IMAGE" ? (
                      <ImageIcon className="h-3 w-3" />
                    ) : (
                      <Music className="h-3 w-3" />
                    )}
                    <span className="truncate">{baseName(a.path)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function baseName(p: string): string {
  return p.split("/").pop() ?? p;
}
