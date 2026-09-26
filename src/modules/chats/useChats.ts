import { useEffect, useState } from "react";
import { getChatMessages, getChats } from "@/api/chats";
import type { Chat, ChatMessage, Credentials } from "@/shared/types";
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

export function useChats(credentials: Credentials | null, activeChatId: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatListError, setChatListError] = useState("");
  const [historyError, setHistoryError] = useState<{ chatId: string; message: string } | null>(null);

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

  useEffect(() => {
    if (!credentials || !activeChatId) return;

    const controller = new AbortController();
    const loadHistory = async () => {
      try {
        const history = await getChatMessages(credentials, activeChatId, controller.signal, 100);
        if (controller.signal.aborted) return;
        if (history === "stop") {
          setHistoryError({ chatId: activeChatId, message: "GREEN-API ограничил загрузку сообщений. Попробуйте позже." });
          return;
        }

        const messages: ChatMessage[] = history
          .filter((item) => item.typeMessage === "textMessage" || item.typeMessage === "extendedTextMessage")
          .map((item) => ({
            id: item.idMessage,
            direction: item.type,
            text: item.textMessage || item.extendedTextMessage?.text || "",
            timestamp: Number(item.timestamp),
            time: new Date(Number(item.timestamp) * 1000).toLocaleTimeString("ru", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
          .reverse();

        setChats((current) => current.map((chat) =>
          chat.chatId === activeChatId ? { ...chat, messages } : chat,
        ));
        setHistoryError(null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setHistoryError({ chatId: activeChatId, message: error instanceof Error ? error.message : "Не удалось загрузить сообщения." });
        }
      }
    };

    void loadHistory();
    return () => controller.abort();
  }, [credentials, activeChatId]);

  return { chats, isLoadingChats, chatListError, historyError: historyError?.chatId === activeChatId ? historyError.message : "", clearChats };
}
