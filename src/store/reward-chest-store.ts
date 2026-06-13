import { create } from "zustand";
import { storage } from "./mmkv";

const LAST_CLAIM_KEY = "reward_chest_last_claim";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getLastClaim(): number | null {
  try {
    const raw = storage.getString(LAST_CLAIM_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

interface RewardChestStore {
  /** Whether the user can open the chest right now */
  canClaim: boolean;
  /** Timestamp of the last successful claim, or null if never */
  lastClaimTime: number | null;
  /** Milliseconds remaining until the next claim is available */
  timeUntilNextClaim: number;
  /** Re-check availability (call on app focus / screen mount) */
  checkAvailability: () => void;
  /** Record a successful claim and start the cooldown */
  recordClaim: () => void;
}

function computeState(lastClaim: number | null) {
  const now = Date.now();
  const canClaim = !lastClaim || now - lastClaim >= COOLDOWN_MS;
  const timeUntilNextClaim = lastClaim
    ? Math.max(0, COOLDOWN_MS - (now - lastClaim))
    : 0;
  return { canClaim, lastClaimTime: lastClaim, timeUntilNextClaim };
}

export const useRewardChestStore = create<RewardChestStore>((set) => ({
  ...computeState(getLastClaim()),

  checkAvailability: () => {
    set(computeState(getLastClaim()));
  },

  recordClaim: () => {
    const now = Date.now();
    storage.set(LAST_CLAIM_KEY, String(now));
    set({ canClaim: false, lastClaimTime: now, timeUntilNextClaim: COOLDOWN_MS });
  },
}));
