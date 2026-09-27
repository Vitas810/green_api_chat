import type { ChatMessage } from "@/shared/types";
import type { ApiAccount } from "@/shared/types";

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

function cacheKey(kind: string, apiAccount: ApiAccount) {
  return `${kind}:${apiAccount.connectionId}:${apiAccount.credentials.idInstance}`;
}

export function getAvatarCache(apiAccount: ApiAccount) {
  return readCache<CachedAvatar>(cacheKey("greenApiAvatarCache", apiAccount));
}

export function getPreviewCache(apiAccount: ApiAccount) {
  return readCache<CachedPreview>(cacheKey("greenApiPreviewCache", apiAccount));
}

export function saveAvatarToCache(apiAccount: ApiAccount, chatId: string, url: string) {
  const key = cacheKey("greenApiAvatarCache", apiAccount);
  const cache = getAvatarCache(apiAccount);
  sessionStorage.setItem(key, JSON.stringify({ ...cache, [chatId]: { url, savedAt: Date.now() } }));
}

export function savePreviewToCache(apiAccount: ApiAccount, chatId: string, preview: ChatMessage, replaceOnEqual = false) {
  const key = cacheKey("greenApiPreviewCache", apiAccount);
  const cache = getPreviewCache(apiAccount);
  const previous = cache[chatId]?.preview;
  if (previous && (previous.timestamp > preview.timestamp || (!replaceOnEqual && previous.timestamp === preview.timestamp))) return;
  sessionStorage.setItem(key, JSON.stringify({ ...cache, [chatId]: { preview, savedAt: Date.now() } }));
}
