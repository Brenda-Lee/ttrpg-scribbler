"use client";

import { create } from "zustand";
import type { GlossaryWord } from "@/lib/grammar/rules";
import type { MentionKind } from "@/lib/mentions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export type SelectedEntity = { kind: MentionKind; entityId: string };

type WorkspaceState = {
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  leftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  saveStatus: SaveStatus;
  setSaveStatus: (s: SaveStatus) => void;
  lastSavedAt: number | null;
  setLastSavedAt: (t: number | null) => void;

  // Cena ativa (para Histórico, autosave, etc.)
  currentSceneId: string | null;
  setCurrentSceneId: (id: string | null) => void;

  // Entidade selecionada (via clique em uma menção no editor) para
  // preview no painel "Detalhes".
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (e: SelectedEntity | null) => void;

  // Pedido de criação de entidade aberto pelo popup de menções (`@criar nova`).
  // O TiptapEditor escuta este estado para abrir o dialog e, após criar,
  // insere a menção na posição original.
  mentionCreator: { range: { from: number; to: number }; query: string } | null;
  setMentionCreator: (
    v: { range: { from: number; to: number }; query: string } | null,
  ) => void;

  // Revisão da cena ativa
  currentText: string | null;
  setCurrentText: (text: string | null) => void;
  glossaryWords: GlossaryWord[];
  setGlossaryWords: (g: GlossaryWord[]) => void;

  // Bump usado para forçar refresh do painel de histórico após autosave
  historyBump: number;
  bumpHistory: () => void;
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  rightPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  leftSidebarCollapsed: false,
  toggleLeftSidebar: () =>
    set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
  saveStatus: "idle",
  setSaveStatus: (s) => set({ saveStatus: s }),
  lastSavedAt: null,
  setLastSavedAt: (t) => set({ lastSavedAt: t }),

  currentSceneId: null,
  setCurrentSceneId: (id) => set({ currentSceneId: id }),

  selectedEntity: null,
  setSelectedEntity: (e) => set({ selectedEntity: e }),

  mentionCreator: null,
  setMentionCreator: (v) => set({ mentionCreator: v }),

  currentText: null,
  setCurrentText: (text) => set({ currentText: text }),
  glossaryWords: [],
  setGlossaryWords: (g) => set({ glossaryWords: g }),

  historyBump: 0,
  bumpHistory: () => set((s) => ({ historyBump: s.historyBump + 1 })),
}));
