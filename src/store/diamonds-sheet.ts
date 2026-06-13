import { create } from "zustand";

interface DiamondsSheetStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useDiamondsSheetStore = create<DiamondsSheetStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
