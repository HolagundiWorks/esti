/**
 * Zustand store for the SteelFlow live editing state.
 * Holds the active session/element selection and transient UI state.
 * Server state (rebars, stirrups) is owned by tRPC queries; this store
 * tracks which element is selected and whether the AI panel is open.
 */
import { create } from "zustand";

interface SteelStore {
  activeSessionId: string | null;
  activeElementId: string | null;
  aiPanelOpen: boolean;
  bbsDialogOpen: boolean;
  setActiveSession: (id: string | null) => void;
  setActiveElement: (id: string | null) => void;
  toggleAiPanel: () => void;
  openBbs: () => void;
  closeBbs: () => void;
}

export const useSteelStore = create<SteelStore>((set) => ({
  activeSessionId: null,
  activeElementId: null,
  aiPanelOpen: false,
  bbsDialogOpen: false,
  setActiveSession: (id) => set({ activeSessionId: id, activeElementId: null }),
  setActiveElement: (id) => set({ activeElementId: id }),
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  openBbs: () => set({ bbsDialogOpen: true }),
  closeBbs: () => set({ bbsDialogOpen: false }),
}));
