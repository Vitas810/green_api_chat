import type { ChatMessage } from "@/shared/types";

export type CachedAvatar = { url?: string; savedAt?: number };
export type CachedPreview = { preview?: ChatMessage; savedAt?: number };

function readCache<T>(key: string): Record<string, T> {
  try {
    const cache = sessionStorage.getItem(key);
    return cache ? (JSON.parse(cache) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

export function getAvatarCache(idInstance: string) {
  return readCache<CachedAvatar>(`greenApiAvatarCache:${idInstance}`);
}

export function getPreviewCache(idInstance: string) {
  return readCache<CachedPreview>(`greenApiPreviewCache:${idInstance}`);
}
