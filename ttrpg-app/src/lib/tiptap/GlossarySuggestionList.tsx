"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

export type SuggestionItem = {
  id: string;
  term: string;
  definition: string;
  partOfSpeech: string;
};

export const GlossarySuggestionList = forwardRef<
  { onKeyDown: (p: SuggestionKeyDownProps) => boolean },
  SuggestionProps<SuggestionItem>
>(function GlossarySuggestionList(props, ref) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  function pick(index: number) {
    const item = props.items[index];
    if (!item) return;
    props.command({ id: item.id, label: item.term } as never);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((s) => (s - 1 + props.items.length) % Math.max(props.items.length, 1));
        return true;
      }
      if (event.key === "Enter") {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) {
    return (
      <div className="rounded-md border bg-popover p-2 text-xs text-muted-foreground shadow-md">
        Nenhum termo no glossário.
      </div>
    );
  }

  return (
    <div className="min-w-[220px] overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-md">
      {props.items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            pick(i);
          }}
          onMouseEnter={() => setSelected(i)}
          className={
            "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left " +
            (i === selected ? "bg-accent text-accent-foreground" : "")
          }
        >
          <span className="font-medium">{item.term}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {item.definition}
          </span>
        </button>
      ))}
    </div>
  );
});
