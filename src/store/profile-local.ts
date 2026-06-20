import { create } from "zustand";
import { storage } from "./mmkv";

const STORAGE_KEY = "profile_local_v1";

interface ProfileLocalData {
  avatarUri: string | null;
  telegramUsername: string;
}

function load(): ProfileLocalData {
  try {
    const raw = storage.getString(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { avatarUri: null, telegramUsername: "" };
  } catch {
    return { avatarUri: null, telegramUsername: "" };
  }
}

function save(data: ProfileLocalData) {
  storage.set(STORAGE_KEY, JSON.stringify(data));
}

interface ProfileLocalStore extends ProfileLocalData {
  setAvatarUri: (uri: string | null) => void;
  setTelegramUsername: (username: string) => void;
}

export const useProfileLocal = create<ProfileLocalStore>((set, get) => ({
  ...load(),

  setAvatarUri: (uri) => {
    const next = { ...get(), avatarUri: uri };
    save({ avatarUri: next.avatarUri, telegramUsername: next.telegramUsername });
    set({ avatarUri: uri });
  },

  setTelegramUsername: (username) => {
    const next = { ...get(), telegramUsername: username };
    save({ avatarUri: next.avatarUri, telegramUsername: next.telegramUsername });
    set({ telegramUsername: username });
  },
}));
