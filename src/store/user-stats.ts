import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "./mmkv";

interface UserStatsState {
  totalXP: number;
  totalGamesPlayed: number;
  lastIQScores: number[]; // Последние 10 результатов для расчета среднего
  
  // Actions
  addXP: (amount: number) => void;
  addIQScore: (score: number) => void;
  resetStats: () => void;
}

export const useUserStats = create<UserStatsState>()(
  persist(
    (set) => ({
      totalXP: 0,
      totalGamesPlayed: 0,
      lastIQScores: [],

      addXP: (amount) => 
        set((state) => ({ 
          totalXP: state.totalXP + amount,
          totalGamesPlayed: state.totalGamesPlayed + 1 
        })),

      addIQScore: (score) =>
        set((state) => {
          const newScores = [...state.lastIQScores, score].slice(-10);
          return { lastIQScores: newScores };
        }),

      resetStats: () => set({ totalXP: 0, totalGamesPlayed: 0, lastIQScores: [] }),
    }),
    {
      name: "user-stats-storage",
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

// Хелперы для расчета уровня
export const calculateLevel = (xp: number) => {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 50)) + 1;
};

export const getXPForLevel = (level: number) => {
  return Math.pow(level - 1, 2) * 50;
};

export const getProgressToNextLevel = (xp: number) => {
  const currentLvl = calculateLevel(xp);
  const currentLvlXP = getXPForLevel(currentLvl);
  const nextLvlXP = getXPForLevel(currentLvl + 1);
  
  const progress = (xp - currentLvlXP) / (nextLvlXP - currentLvlXP);
  return Math.min(Math.max(progress, 0), 1);
};

export const calculateAverageIQ = (scores: number[]) => {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 10) / 10;
};
