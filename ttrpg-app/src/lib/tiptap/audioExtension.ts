import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Extensão custom Tiptap para áudio inline.
 * Renderiza como bloco atômico que exibe um <audio controls src=...>.
 *
 * Comando: editor.chain().focus().setAudio({ src: "/uploads/audio/abc.mp3" }).run()
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "audio[src]",
      },
      {
        tag: "div[data-audio]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src as string | null;
    const title = (HTMLAttributes.title as string | null) ?? "";
    if (!src) return ["div", { "data-audio": "true" }];
    const baseName = src.split("/").pop() ?? src;
    return [
      "div",
      mergeAttributes(
        {
          "data-audio": "true",
          "data-audio-src": src,
          "data-audio-title": title || baseName,
          class: "tiptap-audio",
        },
        HTMLAttributes,
      ),
      [
        "audio",
        {
          controls: "true",
          preload: "metadata",
          src,
          style: "width: 100%;",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src: options.src, title: options.title ?? null },
          });
        },
    };
  },
});
