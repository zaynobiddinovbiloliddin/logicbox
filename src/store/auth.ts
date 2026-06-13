import { AuthModule } from "@/services/modules/auth-module";
import type { UserAchievement } from "@/types/achievements";
import { create } from "zustand";
import { Keys, storage } from "./mmkv";

interface UserInfo {
  id: number;
  userId: number;
  balance: number;
  phoneNumber: string | null;
  score: number;
  activity: number;
  wonCount: number;
  name: string;
  age: number | null;
}

interface UserSkills {
  id: number;
  userId: number;
  thinkingSpeed: number;
  attention: number;
  concentration: number;
  logic: number;
  memory: number;
  iq: number;
  iqDifference: number;
}

interface User {
  id: number;
  username: string;
  role: string;
  name: string;
  info: UserInfo;
  skills: UserSkills;
  achievements: UserAchievement[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  fetchMe: () => Promise<void>;
  logout: () => void;
  withdrawBalance: (amount: number) => void;
}

export const setAccessToken = (token: string) => {
  storage.set(Keys.ACCESS_TOKEN, token);
};

export const getAccessToken = () => {
  return storage.getString(Keys.ACCESS_TOKEN) ?? null;
};

export const removeAccessToken = () => {
  storage.remove(Keys.ACCESS_TOKEN);
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const user = await AuthModule.authMe();

      console.log("user-date", user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      removeAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: () => {
    removeAccessToken();
    set({ user: null, isAuthenticated: false });
  },

  withdrawBalance: (amount) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          info: {
            ...state.user.info,
            balance: Math.max(0, state.user.info.balance - amount),
          },
        },
      };
    }),
}));
