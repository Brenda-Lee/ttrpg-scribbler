import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

// Sidestep the Tiptap-React/jsdom prosemirror bootstrap by stubbing useEditor.
// We still drive the real onUpdate handler (the call site that wires the
// debounced autosave to fetch) via the captured config.
const editorConfigRef: { value: ReturnType<typeof getMockEditor> | null } = {
  value: null,
};

function getMockEditor() {
  return {
    getJSON: vi.fn().mockReturnValue({ type: "doc", content: [] }),
    getText: vi.fn().mockReturnValue(""),
    on: vi.fn(),
    off: vi.fn(),
    view: { dom: document.createElement("div") },
  };
}

vi.mock("@tiptap/react", async () => {
  const actual =
    await vi.importActual<typeof import("@tiptap/react")>("@tiptap/react");
  return {
    ...actual,
    useEditor: (config: { onUpdate: (args: { editor: unknown }) => void }) => {
      const mock = getMockEditor();
      editorConfigRef.value = mock;
      // Expose the onUpdate function so the test can trigger it.
      (mock as unknown as { __onUpdate: typeof config.onUpdate }).__onUpdate =
        config.onUpdate;
      return mock as unknown as ReturnType<typeof actual.useEditor>;
    },
    EditorContent: () => null,
  };
});

// Stub the toolbar + mention dialog so they don't pull in additional deps.
vi.mock("@/components/editor/EditorToolbar", () => ({
  EditorToolbar: () => null,
}));
vi.mock("@/components/editor/MentionCreatorDialog", () => ({
  MentionCreatorDialog: () => null,
}));
vi.mock("@/lib/tiptap/glossaryMention", () => ({
  createGlossaryMention: () => ({ name: "mention-stub" }),
}));
vi.mock("@/lib/tiptap/audioExtension", () => ({ Audio: { name: "audio" } }));

import { TiptapEditor } from "@/components/editor/TiptapEditor";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  editorConfigRef.value = null;
});

function triggerUpdate(text: string) {
  const mock = editorConfigRef.value;
  if (!mock) throw new Error("editor mock not initialised");
  mock.getJSON.mockReturnValue({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text }] },
    ],
  });
  mock.getText.mockReturnValue(text);
  const cb = (mock as unknown as { __onUpdate: (args: { editor: unknown }) => void })
    .__onUpdate;
  cb({ editor: mock });
}

describe("TiptapEditor — debounced autosave integration", () => {
  it("issues exactly one PATCH after 800ms of inactivity following multiple updates", async () => {
    render(
      React.createElement(TiptapEditor, {
        sceneId: "scene-1",
        projectId: "proj-1",
        initialContent: null,
      }),
    );

    await act(async () => {
      triggerUpdate("Hello");
      triggerUpdate("Hello world");
      triggerUpdate("Hello world!");
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/scenes/scene-1");
    expect(init.method).toBe("PATCH");
    const body = JSON.parse(init.body as string);
    expect(body.contentText).toBe("Hello world!");
    expect(body.wordCount).toBe(2);
  });

  it("skips PATCH when the content has not changed from initial", async () => {
    render(
      React.createElement(TiptapEditor, {
        sceneId: "scene-1",
        projectId: "proj-1",
        initialContent: null,
      }),
    );

    const mock = editorConfigRef.value!;
    mock.getJSON.mockReturnValue({});
    mock.getText.mockReturnValue("");

    await act(async () => {
      const cb = (mock as unknown as { __onUpdate: (args: { editor: unknown }) => void })
        .__onUpdate;
      cb({ editor: mock });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
