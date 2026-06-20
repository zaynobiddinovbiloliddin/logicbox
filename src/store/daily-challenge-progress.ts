import { create } from "zustand";
import { storage } from "./mmkv";

const STORAGE_KEY = "daily_challenge_progress_v1";
export const UNLOCK_WAIT_MS = 3 * 60 * 60 * 1000; // 3 hours
const SLOTS = 6;

function todayKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

interface DailyProgressData {
  date: string;
  startedAt: number;
  completedAt: (number | null)[];
  adUnlocked: boolean[];
}

function freshProgress(): DailyProgressData {
  return {
    date: todayKey(),
    startedAt: Date.now(),
    completedAt: Array(SLOTS).fill(null),
    adUnlocked: Array(SLOTS).fill(false),
  };
}

function load(): DailyProgressData {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw) as DailyProgressData;
    if (parsed.date !== todayKey()) return freshProgress();
    return parsed;
  } catch {
    return freshProgress();
  }
}

function save(data: DailyProgressData) {
  storage.set(STORAGE_KEY, JSON.stringify(data));
}

interface DailyProgressStore extends DailyProgressData {
  ensureFresh: () => void;
  unlockStartFor: (index: number) => number | null;
  isCompleted: (index: number) => boolean;
  markCompleted: (index: number) => void;
  markAdUnlocked: (index: number) => void;
}

export const useDailyChallengeProgress = create<DailyProgressStore>((set, get) => ({
  ...load(),

  ensureFresh: () => {
    if (get().date !== todayKey()) {
      const next = freshProgress();
      save(next);
      set(next);
    }
  },

  unlockStartFor: (index) => {
    const state = get();
    if (index === 0) return state.startedAt;
    return state.completedAt[index - 1] ?? null;
  },

  isCompleted: (index) => Boolean(get().completedAt[index]),

  markCompleted: (index) => {
    const state = get();
    if (state.completedAt[index]) return;
    const completedAt = [...state.completedAt];
    completedAt[index] = Date.now();
    save({ ...state, completedAt });
    set({ completedAt });
  },

  markAdUnlocked: (index) => {
    const state = get();
    const adUnlocked = [...state.adUnlocked];
    adUnlocked[index] = true;
    save({ ...state, adUnlocked });
    set({ adUnlocked });
  },
}));
