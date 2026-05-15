"use client";

import { create } from "zustand";
import type { GlossaryWord } from "@/lib/grammar/rules";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type WorkspaceState = {
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  saveStatus: SaveStatus;
  setSaveStatus: (s: SaveStatus) => void;

  // Revisão da cena ativa
  currentText: string | null;
  setCurrentText: (text: string | null) => void;
  glossaryWords: GlossaryWord[];
  setGlossaryWords: (g: GlossaryWord[]) => void;
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  rightPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  saveStatus: "idle",
  setSaveStatus: (s) => set({ saveStatus: s }),

  currentText: null,
  setCurrentText: (text) => set({ currentText: text }),
  glossaryWords: [],
  setGlossaryWords: (g) => set({ glossaryWords: g }),
}));
