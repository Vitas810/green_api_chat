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

export function saveAvatarToCache(idInstance: string, chatId: string, url: string) {
  const key = `greenApiAvatarCache:${idInstance}`;
  const cache = getAvatarCache(idInstance);
  sessionStorage.setItem(key, JSON.stringify({ ...cache, [chatId]: { url, savedAt: Date.now() } }));
}

export function savePreviewToCache(idInstance: string, chatId: string, preview: ChatMessage) {
  const key = `greenApiPreviewCache:${idInstance}`;
  const cache = getPreviewCache(idInstance);
  sessionStorage.setItem(key, JSON.stringify({ ...cache, [chatId]: { preview, savedAt: Date.now() } }));
}
