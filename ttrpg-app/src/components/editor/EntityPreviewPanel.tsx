"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookA,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Scroll,
  User,
  X,
} from "lucide-react";
import { useWorkspace } from "@/stores/workspace";
import { MENTION_KIND_LABEL, type MentionKind } from "@/lib/mentions";

type Preview = {
  kind: MentionKind;
  entityId: string;
  label: string;
  description?: string;
  body?: string;
  details: Array<{ key: string; value: string }>;
  href: string;
};

const ICONS: Record<MentionKind, React.ComponentType<{ className?: string }>> = {
  character: User,
  location: MapPin,
  item: Package,
  lore: Scroll,
  glossary: BookA,
};

export function EntityPreviewPanel({ projectId }: { projectId: string }) {
  const selected = useWorkspace((s) => s.selectedEntity);
  const setSelected = useWorkspace((s) => s.setSelectedEntity);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/mentions/${projectId}/preview?kind=${encodeURIComponent(
        selected.kind,
      )}&id=${encodeURIComponent(selected.entityId)}`,
    )
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setPreview(null);
          setError(res.status === 404 ? "Entidade não encontrada." : "Erro ao carregar.");
          return;
        }
        const data = (await res.json()) as { preview: Preview };
        setPreview(data.preview);
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, projectId]);

  if (!selected) {
    return (
      <section className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        Aperte <kbd className="rounded border bg-muted px-1 text-[10px]">Ctrl</kbd>/
        <kbd className="rounded border bg-muted px-1 text-[10px]">⌘</kbd>+clique em
        uma menção no texto para ver os detalhes da entidade aqui.
      </section>
    );
  }

  const Icon = ICONS[selected.kind];

  return (
    <section className="space-y-2 rounded-md border bg-card p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Badge variant="secondary" className="text-[9px] uppercase">
            {MENTION_KIND_LABEL[selected.kind]}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Fechar preview"
          onClick={() => setSelected(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </header>

      {loading ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
        </p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : preview ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold leading-tight">{preview.label}</h4>
          {preview.details.length > 0 ? (
            <dl className="space-y-0.5 text-[11px]">
              {preview.details.map((d) => (
                <div key={d.key} className="flex gap-1.5">
                  <dt className="text-muted-foreground">{d.key}:</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {preview.description ? (
            <p className="line-clamp-4 text-xs text-muted-foreground">
              {preview.description}
            </p>
          ) : null}
          {preview.body ? (
            <p className="line-clamp-6 text-xs text-muted-foreground whitespace-pre-line">
              {preview.body}
            </p>
          ) : null}
          <Button asChild size="sm" variant="secondary" className="w-full gap-1.5">
            <Link href={preview.href}>
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir ficha completa
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
