import { create } from "zustand";

interface BoostsSheetStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useBoostsSheetStore = create<BoostsSheetStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
