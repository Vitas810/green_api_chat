import { useEffect, useState } from "react";
import { getChats } from "@/api/chats";
import type { Chat, Credentials } from "@/shared/types";
import { getAvatarCache, getPreviewCache } from "@/modules/chats/cache";
import { createChatFromApi, updateChatList } from "@/modules/chats/chatList";
import type { LoadedChat } from "@/modules/chats/chatList";
import { loadAvatars } from "@/modules/chats/loadAvatars.ts";
import { loadPreviews } from "@/modules/chats/loadPreviews";

function getRetryDelay(retryCount: number, retryAfter: string | null) {
  const retryDelay = Math.min(60000 * 2 ** Math.min(retryCount - 1, 3), 300000);
  const serverDelay = Number(retryAfter);
  return Math.max(retryDelay, Number.isFinite(serverDelay) ? serverDelay * 1000 : 0);
}

export function useChats(credentials: Credentials | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatListError, setChatListError] = useState("");

  const clearChats = () => {
    setChats([]);
    setChatListError("");
    setIsLoadingChats(false);
  };

  useEffect(() => {
    if (!credentials) return;

    const controller = new AbortController();
    let rateLimitCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const loadChats = async () => {
      setIsLoadingChats(true);
      setChatListError("");

      try {
        const response = await getChats(credentials, controller.signal);
        if (controller.signal.aborted) return;

        if (response.status === "rate-limited") {
          rateLimitCount += 1;
          retryTimer = setTimeout(loadChats, getRetryDelay(rateLimitCount, response.retryAfter));
          setChatListError("GREEN-API ограничил запросы. Список чатов загрузится позже.");
          return;
        }

        rateLimitCount = 0;
        const avatarCache = getAvatarCache(credentials.idInstance);
        const previewCache = getPreviewCache(credentials.idInstance);
        const fetchedChats: LoadedChat[] = [];
        for (const item of response.chats) {
          const chat = createChatFromApi(item, avatarCache, previewCache);
          if (chat) fetchedChats.push(chat);
        }
        setChats((currentChats) => updateChatList(currentChats, fetchedChats));
        loadAvatars(fetchedChats, credentials, controller.signal, setChats);
        loadPreviews(fetchedChats, credentials, controller.signal, setChats);
      } catch (error) {
        if (controller.signal.aborted) return;
        setChatListError(error instanceof Error ? error.message : "Не удалось загрузить чаты.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingChats(false);
      }
    };

    void loadChats();
    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
  }, [credentials]);

  return { chats, isLoadingChats, chatListError, clearChats };
}
