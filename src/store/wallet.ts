import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "./mmkv";

interface WalletStore {
  balance: number; // in so'm
  addBalance: (amount: number) => void;
  withdrawBalance: (amount: number) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      balance: 125000,

      addBalance: (amount) =>
        set((state) => ({ balance: state.balance + amount })),

      withdrawBalance: (amount) =>
        set((state) => ({ balance: Math.max(0, state.balance - amount) })),
    }),
    {
      name: "wallet-storage",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
