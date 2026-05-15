import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  CREATE_MENTION_SENTINEL,
  GlossarySuggestionList,
  type SuggestionItem,
} from "./GlossarySuggestionList";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { useWorkspace } from "@/stores/workspace";

/**
 * Mention estendido que carrega o atributo `kind` (character | location | item |
 * lore | glossary). Combinado com `id`, permite linkar a menção à entidade
 * exata mesmo se o termo não estiver no glossário.
 */
const EntityMention = Mention.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      kind: {
        default: "glossary",
        parseHTML: (el) => el.getAttribute("data-mention-kind") ?? "glossary",
        renderHTML: (attrs) =>
          attrs.kind ? { "data-mention-kind": attrs.kind as string } : {},
      },
    };
  },
});

export function createGlossaryMention(projectId: string) {
  return EntityMention.configure({
    HTMLAttributes: { class: "entity-mention", "data-mention": "true" },
    renderHTML({ options, node }) {
      const kind = (node.attrs.kind as string) ?? "glossary";
      const id = (node.attrs.id as string) ?? "";
      const label = (node.attrs.label as string) ?? "";
      return [
        "span",
        {
          ...options.HTMLAttributes,
          "data-mention-kind": kind,
          "data-mention-id": id,
          "data-mention-label": label,
          title: `Ctrl/Cmd + clique para ver detalhes de ${label}`,
        },
        label,
      ];
    },
    suggestion: {
      char: "@",
      items: async ({ query }) => {
        try {
          const res = await fetch(
            `/api/mentions/${projectId}?q=${encodeURIComponent(query)}`,
            { cache: "no-store" },
          );
          if (!res.ok) return [];
          const data = (await res.json()) as { items: SuggestionItem[] };
          return data.items ?? [];
        } catch {
          return [];
        }
      },
      command: ({ editor, range, props }) => {
        const attrs = props as unknown as { id: string; label: string; kind: string };
        if (attrs.id === CREATE_MENTION_SENTINEL) {
          // Não insere agora — pede para o TiptapEditor abrir o dialog de
          // criação. O texto `@query` permanece no documento até o dialog
          // confirmar e a menção ser inserida na posição salva.
          useWorkspace.getState().setMentionCreator({
            range: { from: range.from, to: range.to },
            query: attrs.label,
          });
          return;
        }
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: { id: attrs.id, label: attrs.label, kind: attrs.kind },
            },
            { type: "text", text: " " },
          ])
          .run();
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
