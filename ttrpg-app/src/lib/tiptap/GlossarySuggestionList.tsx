"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { BookA, MapPin, Package, Plus, Scroll, User } from "lucide-react";
import { MENTION_KIND_LABEL, type MentionItem, type MentionKind } from "@/lib/mentions";

export type SuggestionItem = MentionItem;

/** Marcador especial: "id" mágico que o command handler detecta para abrir o dialog. */
export const CREATE_MENTION_SENTINEL = "__create_mention__";

const ICONS: Record<MentionKind, React.ComponentType<{ className?: string }>> = {
  character: User,
  location: MapPin,
  item: Package,
  lore: Scroll,
  glossary: BookA,
};

export const GlossarySuggestionList = forwardRef<
  { onKeyDown: (p: SuggestionKeyDownProps) => boolean },
  SuggestionProps<SuggestionItem>
>(function GlossarySuggestionList(props, ref) {
  const [selected, setSelected] = useState(0);
  const query = props.query?.trim() ?? "";
  // Mostra opção "Criar..." quando o usuário digitou algo. O índice da opção
  // criar fica no final da lista para que ArrowDown navegue por ela também.
  const showCreate = query.length > 0;
  const total = props.items.length + (showCreate ? 1 : 0);
  const createIndex = props.items.length;

  useEffect(() => setSelected(0), [props.items, query]);

  function pick(index: number) {
    if (showCreate && index === createIndex) {
      props.command({
        id: CREATE_MENTION_SENTINEL,
        label: query,
        kind: "glossary",
      } as never);
      return;
    }
    const item = props.items[index];
    if (!item) return;
    props.command({
      id: item.entityId,
      label: item.label,
      kind: item.kind,
    } as never);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(total, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + total) % Math.max(total, 1));
        return true;
      }
      if (event.key === "Enter") {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length && !showCreate) {
    return (
      <div className="rounded-md border bg-popover p-2 text-xs text-muted-foreground shadow-md">
        Digite para buscar ou criar uma entidade.
      </div>
    );
  }

  // Agrupa por kind preservando ordem.
  const groups = props.items.reduce<Map<MentionKind, { item: SuggestionItem; index: number }[]>>(
    (acc, item, index) => {
      const arr = acc.get(item.kind) ?? [];
      arr.push({ item, index });
      acc.set(item.kind, arr);
      return acc;
    },
    new Map(),
  );

  return (
    <div className="min-w-[260px] max-h-[320px] overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md">
      {props.items.length === 0 ? (
        <p className="px-2 pt-1.5 text-[11px] text-muted-foreground">
          Nenhum resultado para &ldquo;{query}&rdquo;.
        </p>
      ) : null}
      {Array.from(groups.entries()).map(([kind, entries]) => {
        const Icon = ICONS[kind];
        return (
          <div key={kind}>
            <p className="px-2 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {MENTION_KIND_LABEL[kind]}
            </p>
            {entries.map(({ item, index }) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(index);
                }}
                onMouseEnter={() => setSelected(index)}
                className={
                  "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left " +
                  (index === selected ? "bg-accent text-accent-foreground" : "")
                }
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.label}</p>
                  {item.hint ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{item.hint}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        );
      })}

      {showCreate ? (
        <>
          {props.items.length > 0 ? <div className="my-1 border-t" /> : null}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pick(createIndex);
            }}
            onMouseEnter={() => setSelected(createIndex)}
            className={
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm " +
              (selected === createIndex ? "bg-accent text-accent-foreground" : "")
            }
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              Criar &ldquo;<span className="font-medium">{query}</span>&rdquo; como nova entidade…
            </span>
          </button>
        </>
      ) : null}
    </div>
  );
});
