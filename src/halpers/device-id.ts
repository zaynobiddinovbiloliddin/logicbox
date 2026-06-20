import { storage } from "@/store/mmkv";

const DEVICE_ID_KEY = "stable_device_id";

function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Stable per-install identifier used for fraud detection (e.g. multiple
 * accounts from the same device). Resets on reinstall/clear-data — that's
 * an accepted limitation, not a bug.
 */
export function getDeviceId(): string {
  const existing = storage.getString(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = generateUuid();
  storage.set(DEVICE_ID_KEY, id);
  return id;
}
