import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeChat, normalizeNotification } from "@/api/service";
import { deleteNotification, getChatMessages, getChats, readChat, receiveNotification, sendText } from "@/api/chats";
import type { Chat, ChatMessage, ApiAccount } from "@/shared/types";
import { getAvatarCache, getPreviewCache, savePreviewToCache } from "@/modules/chats/cache";
import { addMessage, createChatFromApi, mergeChatHistory, updateChatList, updateMessageStatus, type LoadedChat } from "@/modules/chats/chatList";
import { loadAvatars } from "@/modules/chats/loadAvatars";
import { loadPreviews } from "@/modules/chats/loadPreviews";
import { messageTime, toChatMessage } from "@/modules/chats/message";

function getRetryDelay(retryCount: number, retryAfter: string | null) {
  const retryDelay = Math.min(60000 * 2 ** Math.min(retryCount - 1, 3), 300000);
  const serverDelay = Number(retryAfter);
  return Math.max(retryDelay, Number.isFinite(serverDelay) ? serverDelay * 1000 : 0);
}

export function useChats(apiAccount: ApiAccount | null, activeChatId: string | null) {
  const accountController = useMemo(() => apiAccount ? new AbortController() : null, [apiAccount]);
  useEffect(() => () => accountController?.abort(), [accountController]);
  const [chats, setChats] = useState<Chat[]>([]);
  const chatsRef = useRef(chats);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatListError, setChatListError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [historyError, setHistoryError] = useState<{ chatId: string; message: string } | null>(null);
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeApiChatId = activeChat?.chatId ?? null;
  const unreadCount = activeChat?.unreadCount ?? 0;

  const clearChats = () => {
    setChats([]);
    setChatListError("");
    setNotificationError("");
    setHistoryError(null);
    setIsLoadingChats(false);
  };

  const addChat = (chatId: string, number: string) => {
    setChats((current) => {
      if (current.some((chat) => chat.chatId === chatId)) return current;
      return [{ id: chatId, chatId, name: `+${number}`, messages: [], unreadCount: 0 }, ...current];
    });
  };

  const sendMessage = async (chatId: string, text: string, quotedMessageId?: string) => {
    if (!apiAccount) return;
    const id = await sendText(apiAccount, chatId, text, quotedMessageId, accountController?.signal);
    if (accountController?.signal.aborted) return;
    const timestamp = Math.floor(Date.now() / 1000);
    const message: ChatMessage = {
      id, direction: "outgoing", text, timestamp, time: messageTime(timestamp),
      quotedId: quotedMessageId, status: "pending",
    };
    setChats((current) => addMessage(current, chatId, message));
  };

  useEffect(() => {
    if (!apiAccount) return;
    const controller = new AbortController();
    let rateLimitCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const loadChats = async () => {
      setIsLoadingChats(true);
      setChatListError("");
      try {
        const response = await getChats(apiAccount, controller.signal);
        if (controller.signal.aborted) return;
        if (response.status === "rate-limited") {
          rateLimitCount += 1;
          retryTimer = setTimeout(loadChats, getRetryDelay(rateLimitCount, response.retryAfter));
          setChatListError("GREEN-API ограничил запросы. Список чатов загрузится позже.");
          return;
        }
        rateLimitCount = 0;
        const avatarCache = getAvatarCache(apiAccount);
        const previewCache = getPreviewCache(apiAccount);
        const fetchedChats: LoadedChat[] = [];
        for (const item of response.chats) {
          const normalized = normalizeChat(apiAccount, item);
          if (!normalized) continue;
          const chat = createChatFromApi(normalized, avatarCache, previewCache);
          if (chat) fetchedChats.push(chat);
        }
        setChats((currentChats) => updateChatList(currentChats, fetchedChats));
        void loadAvatars(fetchedChats, apiAccount, controller.signal, setChats);
        void loadPreviews(fetchedChats, apiAccount, controller.signal, setChats);
      } catch (error) {
        if (!controller.signal.aborted) setChatListError(error instanceof Error ? error.message : "Не удалось загрузить чаты.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingChats(false);
      }
    };
    void loadChats();
    return () => { controller.abort(); clearTimeout(retryTimer); };
  }, [apiAccount]);

  useEffect(() => {
    if (!apiAccount || !activeApiChatId) return;
    const controller = new AbortController();
    const loadHistory = async () => {
      try {
        const history = await getChatMessages(apiAccount, activeApiChatId, controller.signal, 100);
        if (controller.signal.aborted) return;
        if (history === "stop") {
          setHistoryError({ chatId: activeApiChatId, message: "GREEN-API ограничил загрузку сообщений. Попробуйте позже." });
          return;
        }
        const messages = history.map(toChatMessage).filter((message) => message !== null).reverse();
        setChats((current) => current.map((chat) => chat.chatId === activeApiChatId ? mergeChatHistory(chat, messages) : chat));
        setHistoryError(null);
      } catch (error) {
        if (!controller.signal.aborted) setHistoryError({ chatId: activeApiChatId, message: error instanceof Error ? error.message : "Не удалось загрузить сообщения." });
      }
    };
    void loadHistory();
    return () => controller.abort();
  }, [apiAccount, activeApiChatId]);

  useEffect(() => {
    if (!apiAccount || !activeApiChatId || unreadCount === 0) return;
    const controller = new AbortController();
    let reading = false;
    const markRead = async () => {
      if (document.visibilityState !== "visible" || reading) return;
      reading = true;
      try {
        if (!await readChat(apiAccount, activeApiChatId, controller.signal) || controller.signal.aborted) return;
        setChats((current) => current.map((chat) => chat.chatId === activeApiChatId ? { ...chat, unreadCount: 0 } : chat));
      } catch {
        // Keep the count until a successful read receipt.
      } finally {
        reading = false;
      }
    };
    void markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", markRead); };
  }, [apiAccount, activeApiChatId, unreadCount]);

  useEffect(() => {
    if (!apiAccount) return;
    const controller = new AbortController();
    const listen = async () => {
      while (!controller.signal.aborted) {
        try {
          const notification = await receiveNotification(apiAccount, controller.signal);
          if (controller.signal.aborted) return;
          setNotificationError("");
          if (!notification) continue;
          const { receiptId } = notification;
          const event = normalizeNotification(notification);
          if (event?.type === "status" && event.status) {
            setChats((current) => updateMessageStatus(current, event.messageId, event.status));
          }
          if (event?.type === "message") {
            const { chatId, chatName, message } = event;
            const cacheChatId = chatsRef.current.find((chat) => chat.chatId === chatId || chat.aliasChatId === chatId)?.chatId ?? chatId;
            try { savePreviewToCache(apiAccount, cacheChatId, message, true); } catch {}
            setChats((current) => addMessage(current, chatId, message, chatName));
          }
          await deleteNotification(apiAccount, receiptId, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) return;
          setNotificationError(error instanceof Error ? error.message : "Не удалось получить уведомления.");
          await new Promise((resolve) => setTimeout(resolve, error instanceof Error && error.message.includes("429") ? 30000 : 5000));
        }
      }
    };
    void listen();
    return () => controller.abort();
  }, [apiAccount]);

  return {
    chats, isLoadingChats, chatListError, notificationError,
    historyError: historyError?.chatId === activeApiChatId ? historyError.message : "",
    addChat, sendMessage, clearChats,
  };
}
