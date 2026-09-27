import { getChatMessages } from "@/api/chats";
import { getPreviewCache, savePreviewToCache } from "@/modules/chats/cache";
import { toChatMessage } from "@/modules/chats/message";
import type { LoadedChat } from "@/modules/chats/chatList";
import type { Dispatch, SetStateAction } from "react";
import type { Chat, ApiAccount } from "@/shared/types";

export async function loadPreviews(
  chats: LoadedChat[],
  apiAccount: ApiAccount,
  signal: AbortSignal,
  setChats: Dispatch<SetStateAction<Chat[]>>,
) {
  const cache = getPreviewCache(apiAccount);

  for (const chat of chats) {
    if (signal.aborted) return;
    const cached = cache[chat.chatId];
    if (cached?.preview && Date.now() - (cached.savedAt ?? 0) < 60 * 60 * 1000) continue;

    try {
      const history = await getChatMessages(apiAccount, chat.chatId, signal);
      if (history === "stop" || signal.aborted) return;

      const preview = history.map(toChatMessage).filter((message) => message !== null)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (preview) {
        setChats((current) => current.map((item) => {
          if (item.chatId !== chat.chatId) return item;
          if (item.preview && item.preview.timestamp >= preview.timestamp) return item;
          return { ...item, preview };
        }));

        try {
          savePreviewToCache(apiAccount, chat.chatId, preview);
        } catch {}
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
