import { getChatMessages } from "@/api/chats";
import type { ApiMessage } from "@/api/chats";
import { getPreviewCache, savePreviewToCache } from "@/modules/chats/cache";
import type { LoadedChat } from "@/modules/chats/chatList";
import type { Dispatch, SetStateAction } from "react";
import type { Chat, ChatMessage, Credentials } from "@/shared/types";

function textPreview(item: ApiMessage): ChatMessage | null {
  if (item.typeMessage !== "textMessage" && item.typeMessage !== "extendedTextMessage") return null;
  const text = item.textMessage || item.extendedTextMessage?.text;

  if (!text?.trim() || !item.idMessage) return null;
  const timestamp = Number(item.timestamp);
  if (!Number.isFinite(timestamp)) return null;

  return {
    id: item.idMessage,
    direction: "incoming",
    text,
    timestamp,
    time: new Date(timestamp * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
  };
}

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
        .map(textPreview)
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
