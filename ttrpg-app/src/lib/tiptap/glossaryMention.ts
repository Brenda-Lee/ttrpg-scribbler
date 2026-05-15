import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { GlossarySuggestionList, type SuggestionItem } from "./GlossarySuggestionList";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

export function createGlossaryMention(projectId: string) {
  return Mention.configure({
    HTMLAttributes: { class: "glossary-mention", "data-glossary": "true" },
    renderHTML({ options, node }) {
      return [
        "span",
        {
          ...options.HTMLAttributes,
          "data-term-id": (node.attrs.id as string) ?? "",
          "data-term-label": (node.attrs.label as string) ?? "",
        },
        node.attrs.label as string,
      ];
    },
    suggestion: {
      char: "@",
      items: async ({ query }) => {
        try {
          const res = await fetch(
            `/api/glossary/${projectId}?q=${encodeURIComponent(query)}`,
            { cache: "no-store" },
          );
          if (!res.ok) return [];
          const data = (await res.json()) as SuggestionItem[];
          return data.slice(0, 8);
        } catch {
          return [];
        }
      },
      render: () => {
        let component: ReactRenderer<{
          onKeyDown: (props: SuggestionKeyDownProps) => boolean;
        }> | null = null;
        let popup: TippyInstance[] | null = null;

        return {
          onStart: (props: SuggestionProps<SuggestionItem>) => {
            component = new ReactRenderer(GlossarySuggestionList, {
              props,
              editor: props.editor,
            });
            if (!props.clientRect) return;
            popup = tippy("body", {
              getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          onUpdate: (props: SuggestionProps<SuggestionItem>) => {
            component?.updateProps(props);
            if (!props.clientRect) return;
            popup?.[0]?.setProps({
              getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
            });
          },
          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === "Escape") {
              popup?.[0]?.hide();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            popup?.[0]?.destroy();
            component?.destroy();
            popup = null;
            component = null;
          },
        };
      },
    },
  });
}
