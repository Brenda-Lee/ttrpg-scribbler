"use client";

import { create } from "zustand";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type WorkspaceState = {
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  saveStatus: SaveStatus;
  setSaveStatus: (s: SaveStatus) => void;
};

export const useWorkspace = create<WorkspaceState>((set) => ({
  rightPanelOpen: true,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  saveStatus: "idle",
  setSaveStatus: (s) => set({ saveStatus: s }),
}));
