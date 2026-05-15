"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useRef } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { createGlossaryMention } from "@/lib/tiptap/glossaryMention";
import { useWorkspace } from "@/stores/workspace";
import type { GlossaryWord } from "@/lib/grammar/rules";

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Comece a escrever sua cena..." }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
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
          if (res.ok) lastSavedRef.current = serialized;
        } catch {
          // swallow — autosave will retry on next edit
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

  // Limpeza no unmount do editor (mudança de cena / saída da página).
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setCurrentText(null);
      setGlossaryWords([]);
    };
  }, [setCurrentText, setGlossaryWords]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
