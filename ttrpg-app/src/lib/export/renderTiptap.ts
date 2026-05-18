import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";
import { Audio } from "@/lib/tiptap/audioExtension";

/**
 * Mention configurado igual ao editor: aceita atributo `kind` para distinguir
 * a entidade vinculada (character / location / item / lore / glossary).
 */
const ExportMention = Mention.extend({
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

/**
 * Mesma lista de extensões do editor (TiptapEditor.tsx), porém sem
 * configuração runtime (placeholder, suggestion popover, etc.) — apenas o
 * suficiente para o parser conhecer cada node/mark ao gerar HTML.
 */
// StarterKit v3 already bundles `link` and `underline`; opt out so the
// explicitly-imported versions don't trigger duplicate-extension warnings
// during `generateHTML` (visible at /projects/[id]/export/print).
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
    underline: false,
  }),
  Underline,
  Link,
  Typography,
  TaskList,
  TaskItem.configure({ nested: true }),
  Image,
  Audio,
  ExportMention,
];

export function tiptapJsonToHtml(json: JSONContent | null): string {
  if (!json) return "";
  try {
    return generateHTML(json, extensions);
  } catch {
    return "";
  }
}

export function safeParseTiptapJson(raw: string | null): JSONContent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as JSONContent;
    return null;
  } catch {
    return null;
  }
}
