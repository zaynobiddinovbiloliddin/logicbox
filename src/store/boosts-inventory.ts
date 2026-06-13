import { create } from "zustand";
import { storage } from "./mmkv";
import { BoostsModule } from "@/services/modules/boosts-module";
import { useAuthStore } from "./auth";
import { getSlugForRemoteBoost } from "@/constants/powerups";

const STORAGE_KEY = "boosts_inventory_v7";

export interface RemoteBoost {
  id: number;
  title: string;
  description: string;
  price: number;
  userCount: number;
}

// Record<slug, count>
type Inventory = Record<string, number>;

function loadInventory(): Inventory {
  try {
    const raw = storage.getString(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveInventory(inv: Inventory) {
  storage.set(STORAGE_KEY, JSON.stringify(inv));
}

interface BoostsInventoryStore {
  inventory: Inventory;
  remoteBoosts: RemoteBoost[];
  isLoading: boolean;
  getCount: (slug: string) => number;
  addBoost: (slug: string, amount?: number) => void;
  useBoost: (slug: string) => boolean;
  fetchInventory: () => Promise<void>;
  buyBoostApi: (backendId: number, count?: number) => Promise<boolean>;
}

export const useBoostsInventory = create<BoostsInventoryStore>((set, get) => ({
  inventory: loadInventory(),
  remoteBoosts: [],
  isLoading: false,

  getCount: (slug) => get().inventory[slug] ?? 0,

  addBoost: (slug, amount = 1) => {
    const next = {
      ...get().inventory,
      [slug]: (get().inventory[slug] ?? 0) + amount,
    };
    saveInventory(next);
    set({ inventory: next });
  },

  useBoost: (slug) => {
    const current = get().inventory[slug] ?? 0;
    if (current <= 0) return false;
    const next = { ...get().inventory, [slug]: current - 1 };
    saveInventory(next);
    set({ inventory: next });

    // Fire API call in background
    const userId = useAuthStore.getState().user?.id;
    const remoteBoosts = get().remoteBoosts;
    if (userId) {
      const matchedRemote = remoteBoosts.find(
        (r) => getSlugForRemoteBoost(r) === slug,
      );
      if (matchedRemote) {
        BoostsModule.consumeBoost(userId, matchedRemote.id).catch((e) =>
          console.error(`Failed to sync boost usage for slug ${slug}:`, e),
        );
      }
    }

    return true;
  },

  fetchInventory: async () => {
    try {
      set({ isLoading: true });
      const data: RemoteBoost[] = await BoostsModule.getBoosts();
      if (Array.isArray(data)) {
        const next: Inventory = {};
        data.forEach((item) => {
          next[getSlugForRemoteBoost(item)] = item.userCount;
        });
        saveInventory(next);
        set({ remoteBoosts: data, inventory: next, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error("Failed to fetch boosts inventory:", e);
      set({ isLoading: false });
    }
  },

  buyBoostApi: async (backendId, count = 1) => {
    try {
      set({ isLoading: true });
      await BoostsModule.buyBoost(backendId, count);

      const matchedRemote = get().remoteBoosts.find((r) => r.id === backendId);
      if (matchedRemote) {
        const slug = getSlugForRemoteBoost(matchedRemote);
        get().addBoost(slug, count);
      }

      set({ isLoading: false });
      return true;
    } catch (e) {
      console.error(`Failed to buy boost backendId ${backendId}:`, e);
      set({ isLoading: false });
      return false;
    }
  },
}));
