import type { ApiChat, Chat } from "@/shared/types";
import type { CachedAvatar, CachedPreview } from "@/modules/chats/cache";

export type LoadedChat = Chat & { chatId: string; aliasChatId: string | null };

const validChatId = (value?: string): value is string => {
  return typeof value === "string" && /(@c\.us|@g\.us|@lid)$/.test(value);
};

export function createChatFromApi(
  item: ApiChat,
  avatarCache: Record<string, CachedAvatar>,
  previewCache: Record<string, CachedPreview>,
): LoadedChat | null {
  if (typeof item?.id !== "string") return null;

  const chatId = /^\d+$/.test(item.id) ? `${item.id}@c.us` : item.id;
  if (!validChatId(chatId)) return null;

  const avatar = avatarCache[chatId];
  const preview = previewCache[chatId];

  return {
    id: chatId,
    chatId,
    aliasChatId: validChatId(item.newChatId) ? item.newChatId : null,
    name: typeof item.name === "string" && item.name.trim() ? item.name : chatId.replace(/@.*$/, ""),
    avatar: avatar?.url && avatar.savedAt && Date.now() - avatar.savedAt < 60 * 60 * 1000 ? avatar.url : undefined,
    preview: preview?.preview || undefined,
    previewLoaded: Boolean(preview?.savedAt && Date.now() - preview.savedAt < 60 * 60 * 1000),
    unreadCount: Number.isInteger(item.unreadCount) ? Number(item.unreadCount) : 0,
    messages: [],
  };
}

export function updateChatList(currentChats: Chat[], fetchedChats: LoadedChat[]): Chat[] {
  const currentChatIndexById = new Map<string, number>();

  currentChats.forEach((chat, index) => {
    if (chat.chatId && !currentChatIndexById.has(chat.chatId)) {
      currentChatIndexById.set(chat.chatId, index);
    }

    if (chat.aliasChatId && !currentChatIndexById.has(chat.aliasChatId)) {
      currentChatIndexById.set(chat.aliasChatId, index);
    }
  });

  const fetchedChatIds = new Set<string>();
  const updatedChats: Chat[] = fetchedChats.map((apiChat) => {
    fetchedChatIds.add(apiChat.chatId);

    if (apiChat.aliasChatId) fetchedChatIds.add(apiChat.aliasChatId);

    const primaryIndex = currentChatIndexById.get(apiChat.chatId);
    const aliasIndex = apiChat.aliasChatId ? currentChatIndexById.get(apiChat.aliasChatId) : undefined;
    const existingIndex = Math.min(primaryIndex ?? Infinity, aliasIndex ?? Infinity);
    const currentChat = currentChats[existingIndex];

    return currentChat
      ? { ...apiChat, ...currentChat, name: apiChat.name, chatId: apiChat.chatId, aliasChatId: apiChat.aliasChatId }
      : apiChat;
  });

  for (const chat of currentChats) {
    if (!fetchedChatIds.has(chat.chatId ?? "") && !fetchedChatIds.has(chat.aliasChatId ?? "")) updatedChats.push(chat);
  }

  return updatedChats;
}
