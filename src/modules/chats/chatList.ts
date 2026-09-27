import type { ApiChat, Chat, ChatMessage } from "@/shared/types";
import type { CachedAvatar, CachedPreview } from "@/modules/chats/cache";
import { latestStatus } from "@/modules/chats/message";

export type LoadedChat = Chat & { chatId: string; aliasChatId: string | null };

export function createChatFromApi(
  item: ApiChat,
  avatarCache: Record<string, CachedAvatar>,
  previewCache: Record<string, CachedPreview>,
): LoadedChat | null {
  const chatId = item.chatId;
  if (!chatId) return null;

  const avatar = avatarCache[chatId];
  const preview = previewCache[chatId];

  return {
    id: chatId,
    chatId,
    aliasChatId: item.aliasChatId,
    name: item.name,
    avatar: avatar?.url && avatar.savedAt && Date.now() - avatar.savedAt < 60 * 60 * 1000 ? avatar.url : undefined,
    preview: preview?.preview || undefined,
    previewLoaded: Boolean(preview?.savedAt && Date.now() - preview.savedAt < 60 * 60 * 1000),
    unreadCount: item.unreadCount,
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

export function addMessage(chats: Chat[], chatId: string, message: ChatMessage, chatName?: string): Chat[] {
  const existing = chats.find((chat) => chat.chatId === chatId || chat.aliasChatId === chatId);
  if (!existing) {
    if (!chatName) return chats;
    return [{
      id: chatId, chatId, name: chatName, messages: [message], preview: message,
      unreadCount: message.direction === "incoming" ? 1 : 0,
    }, ...chats];
  }

  if (existing.messages.some((item) => item.id === message.id)) return chats;

  return chats.map((chat) => {
    if (chat.id !== existing.id) return chat;
    const preview = chat.preview && chat.preview.timestamp > message.timestamp ? chat.preview : message;
    return {
      ...chat,
      messages: [...chat.messages, message],
      preview,
      unreadCount: chat.unreadCount + (message.direction === "incoming" ? 1 : 0),
    };
  });
}

export function mergeChatHistory(chat: Chat, history: ChatMessage[]): Chat {
  const byId = new Map(history.map((message) => [message.id, message]));
  for (const message of chat.messages) {
    const previous = byId.get(message.id);
    byId.set(message.id, {
      ...previous,
      ...message,
      status: latestStatus(message.status, previous?.status),
    });
  }
  return { ...chat, messages: [...byId.values()].sort((a, b) => a.timestamp - b.timestamp) };
}

export function updateMessageStatus(chats: Chat[], messageId: string, status: ChatMessage["status"]): Chat[] {
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) => message.id === messageId
      ? { ...message, status: latestStatus(message.status, status) }
      : message),
  }));
}
