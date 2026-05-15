import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import type { JSONContent } from "@tiptap/core";

/**
 * Mesma lista de extensões do editor (TiptapEditor.tsx), porém sem
 * configuração runtime (placeholder, suggestion popover, etc.) — apenas o
 * suficiente para o parser conhecer cada node/mark ao gerar HTML.
 */
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  Link,
  Typography,
  TaskList,
  TaskItem.configure({ nested: true }),
  Mention,
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
