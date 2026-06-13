import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV();

export const Keys = {
  LANGUAGE: "app_language",
  USER_NAME: "user_display_name",
  ACCESS_TOKEN: "access_token",
};

export const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.remove(name),
};
