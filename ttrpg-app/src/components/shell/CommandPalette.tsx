"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  User,
  MapPin,
  Package,
  Scroll,
  BookA,
  PenLine,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResults = {
  characters: Array<{ id: string; name: string; role?: string }>;
  locations: Array<{ id: string; name: string }>;
  items: Array<{ id: string; name: string }>;
  lore: Array<{ id: string; title: string; category: string }>;
  glossary: Array<{ id: string; term: string; definition: string }>;
  scenes: Array<{ id: string; title: string; chapter: string; act: string }>;
};

type FlatItem = {
  key: string;
  label: string;
  sub?: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function CommandPalette({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho global Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setHighlight(0);
    }
  }, [open]);

  // Busca debounced
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/${projectId}?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = (await res.json()) as SearchResults;
          setResults(data);
          setHighlight(0);
        }
      } finally {
        setLoading(false);
      }
    }, 180);
  }, [query, projectId, open]);

  const flat: FlatItem[] = results
    ? [
        ...results.characters.map((c) => ({
          key: `char-${c.id}`,
          label: c.name,
          sub: c.role,
          href: `/projects/${projectId}/characters/${c.id}`,
          group: "Personagens",
          icon: User,
        })),
        ...results.locations.map((l) => ({
          key: `loc-${l.id}`,
          label: l.name,
          href: `/projects/${projectId}/world/locations/${l.id}`,
          group: "Locais",
          icon: MapPin,
        })),
        ...results.items.map((i) => ({
          key: `it-${i.id}`,
          label: i.name,
          href: `/projects/${projectId}/world/items/${i.id}`,
          group: "Itens",
          icon: Package,
        })),
        ...results.lore.map((l) => ({
          key: `lore-${l.id}`,
          label: l.title,
          sub: l.category,
          href: `/projects/${projectId}/world/lore/${l.id}`,
          group: "Lore",
          icon: Scroll,
        })),
        ...results.glossary.map((g) => ({
          key: `glo-${g.id}`,
          label: g.term,
          sub: g.definition.slice(0, 60),
          href: `/projects/${projectId}/glossary/${g.id}`,
          group: "Glossário",
          icon: BookA,
        })),
        ...results.scenes.map((s) => ({
          key: `sc-${s.id}`,
          label: s.title,
          sub: `${s.act} · ${s.chapter}`,
          href: `/projects/${projectId}/write/${s.id}`,
          group: "Cenas",
          icon: PenLine,
        })),
      ]
    : [];

  function go(item: FlatItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[highlight];
      if (target) go(target);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar personagens, locais, cenas, glossário…"
            className="h-9 border-0 px-0 focus-visible:ring-0"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() ? (
            <Hint />
          ) : flat.length === 0 ? (
            loading ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Procurando…
              </p>
            ) : (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Nada encontrado para &ldquo;{query.trim()}&rdquo;.
              </p>
            )
          ) : (
            <ResultList flat={flat} highlight={highlight} onPick={go} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultList({
  flat,
  highlight,
  onPick,
}: {
  flat: FlatItem[];
  highlight: number;
  onPick: (item: FlatItem) => void;
}) {
  // Agrupa preservando a ordem de prioridade
  const grouped = flat.reduce<Record<string, FlatItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  let idx = -1;
  return (
    <div className="py-1">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </p>
          {items.map((item) => {
            idx += 1;
            const active = idx === highlight;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onPick(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.label}</p>
                  {item.sub ? (
                    <p className="truncate text-[11px] text-muted-foreground">{item.sub}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Hint() {
  return (
    <div className="space-y-1 px-4 py-5 text-xs text-muted-foreground">
      <p>Digite para buscar em todo o projeto.</p>
      <p>
        Use <kbd className="rounded border bg-muted px-1 text-[10px]">↑</kbd>{" "}
        <kbd className="rounded border bg-muted px-1 text-[10px]">↓</kbd> para navegar,{" "}
        <kbd className="rounded border bg-muted px-1 text-[10px]">Enter</kbd> para abrir.
      </p>
    </div>
  );
}
