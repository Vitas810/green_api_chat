import { getChatMessages } from "@/api/chats";
import { getPreviewCache, savePreviewToCache } from "@/modules/chats/cache";
import type { LoadedChat } from "@/modules/chats/chatList";
import { toChatMessage } from "@/modules/chats/message";
import type { Dispatch, SetStateAction } from "react";
import type { Chat, ChatMessage, Credentials } from "@/shared/types";

export async function loadPreviews(
  chats: LoadedChat[],
  credentials: Credentials,
  signal: AbortSignal,
  setChats: Dispatch<SetStateAction<Chat[]>>,
) {
  const cache = getPreviewCache(credentials.idInstance);

  for (const chat of chats) {
    if (signal.aborted) return;
    const cached = cache[chat.chatId];
    if (cached?.preview && Date.now() - (cached.savedAt ?? 0) < 60 * 60 * 1000) continue;

    try {
      const history = await getChatMessages(credentials, chat.chatId, signal);
      if (history === "stop" || signal.aborted) return;

      const preview = history
        .map(toChatMessage)
        .filter((item): item is ChatMessage => item !== null)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (preview) {
        setChats((current) => current.map((item) => (item.chatId === chat.chatId ? { ...item, preview } : item)));

        try {
          savePreviewToCache(credentials.idInstance, chat.chatId, preview);
        } catch {}
      }
    } catch {
      if (signal.aborted) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
