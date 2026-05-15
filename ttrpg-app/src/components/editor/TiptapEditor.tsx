"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { MentionCreatorDialog } from "./MentionCreatorDialog";
import { createGlossaryMention } from "@/lib/tiptap/glossaryMention";
import { Audio } from "@/lib/tiptap/audioExtension";
import { useWorkspace } from "@/stores/workspace";
import { type MentionKind } from "@/lib/mentions";
import type { GlossaryWord } from "@/lib/grammar/rules";

const MENTION_KINDS = new Set<MentionKind>([
  "glossary",
  "character",
  "location",
  "item",
  "lore",
]);

type Props = {
  sceneId: string;
  projectId: string;
  initialContent: JSONContent | null;
  placeholder?: string;
  glossaryWords?: GlossaryWord[];
};

export function TiptapEditor({
  sceneId,
  projectId,
  initialContent,
  placeholder,
  glossaryWords,
}: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(initialContent ?? {}));
  const setCurrentText = useWorkspace((s) => s.setCurrentText);
  const setGlossaryWords = useWorkspace((s) => s.setGlossaryWords);
  const setSaveStatus = useWorkspace((s) => s.setSaveStatus);
  const setLastSavedAt = useWorkspace((s) => s.setLastSavedAt);
  const setCurrentSceneId = useWorkspace((s) => s.setCurrentSceneId);
  const setSelectedEntity = useWorkspace((s) => s.setSelectedEntity);
  const bumpHistory = useWorkspace((s) => s.bumpHistory);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Comece a escrever sua cena..." }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "tiptap-image" } }),
      Audio,
      createGlossaryMention(projectId),
    ],
    content: initialContent ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-8 py-10",
        spellcheck: "true",
        lang: "pt-BR",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const text = editor.getText();
      const serialized = JSON.stringify(json);
      if (serialized === lastSavedRef.current) return;

      setSaveStatus("saving");

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/scenes/${sceneId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contentJson: json,
              contentText: text,
              wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
            }),
          });
          if (res.ok) {
            lastSavedRef.current = serialized;
            setSaveStatus("saved");
            setLastSavedAt(Date.now());
            bumpHistory();
          } else {
            setSaveStatus("error");
          }
        } catch {
          setSaveStatus("error");
        }
      }, 800);
    },
  });

  // Listener próprio para a revisão: dispara em cada update do editor.
  // Usar editor.on('update', ...) evita closures stale do callback onUpdate
  // do useEditor e garante atualização imediata do painel.
  useEffect(() => {
    if (!editor) return;
    const push = () => setCurrentText(editor.getText());
    push(); // estado inicial
    editor.on("update", push);
    return () => {
      editor.off("update", push);
    };
  }, [editor, setCurrentText]);

  // Sincroniza o glossário do projeto no store de workspace para o painel de revisão.
  useEffect(() => {
    setGlossaryWords(glossaryWords ?? []);
  }, [glossaryWords, setGlossaryWords]);

  // Setar/limpar id da cena ativa no store (consumido pelo painel de histórico).
  useEffect(() => {
    setCurrentSceneId(sceneId);
    return () => setCurrentSceneId(null);
  }, [sceneId, setCurrentSceneId]);

  // Ctrl/Cmd+clique em uma menção popula o painel "Detalhes" com o resumo
  // da entidade vinculada. O painel oferece um botão para abrir a ficha completa.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    function handle(e: MouseEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-mention-kind][data-mention-id]",
      );
      if (!target) return;
      const kind = target.getAttribute("data-mention-kind") as MentionKind | null;
      const id = target.getAttribute("data-mention-id");
      if (!kind || !id || !MENTION_KINDS.has(kind)) return;
      e.preventDefault();
      e.stopPropagation();
      const store = useWorkspace.getState();
      store.setSelectedEntity({ kind, entityId: id });
      if (!store.rightPanelOpen) store.toggleRightPanel();
    }
    dom.addEventListener("click", handle);
    return () => dom.removeEventListener("click", handle);
  }, [editor]);

  // Limpeza no unmount do editor (mudança de cena / saída da página).
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setCurrentText(null);
      setGlossaryWords([]);
      setSaveStatus("idle");
      setLastSavedAt(null);
      setSelectedEntity(null);
    };
  }, [setCurrentText, setGlossaryWords, setSaveStatus, setLastSavedAt, setSelectedEntity]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} projectId={projectId} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <MentionCreatorDialog projectId={projectId} editor={editor} />
    </div>
  );
}
