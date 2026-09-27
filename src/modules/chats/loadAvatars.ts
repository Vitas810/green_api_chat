import { getAvatar } from "@/api/chats";
import { saveAvatarToCache } from "@/modules/chats/cache.ts";
import type { Dispatch, SetStateAction } from "react";
import type { Chat, ApiAccount } from "@/shared/types";
import type { LoadedChat } from "@/modules/chats/chatList";

export const loadAvatars = async (
  chats: LoadedChat[],
  apiAccount: ApiAccount,
  signal: AbortSignal,
  setChats: Dispatch<SetStateAction<Chat[]>>,
) => {
  for (const chat of chats) {
    if (signal.aborted) return;
    if (chat.avatar) continue;

    try {
      const url = await getAvatar(apiAccount, chat.chatId, signal);
      if (url === "stop" || signal.aborted) return;

      if (url) {
        saveAvatarToCache(apiAccount, chat.chatId, url);
        setChats((current) => current.map((item) => (item.chatId === chat.chatId ? { ...item, avatar: url } : item)));
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
