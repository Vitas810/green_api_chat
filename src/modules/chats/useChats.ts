import { useEffect, useState } from "react";
import { deleteNotification, getChatMessages, getChats, readChat, receiveNotification, sendText } from "@/api/chats";
import type { Chat, ChatMessage, Credentials } from "@/shared/types";
import { getAvatarCache, getPreviewCache } from "@/modules/chats/cache";
import { createChatFromApi, updateChatList } from "@/modules/chats/chatList";
import type { LoadedChat } from "@/modules/chats/chatList";
import { loadAvatars } from "@/modules/chats/loadAvatars.ts";
import { loadPreviews } from "@/modules/chats/loadPreviews";
import { messageStatus, messageTime, toChatMessage } from "@/modules/chats/message";

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
  const unreadCount = chats.find((chat) => chat.chatId === activeChatId)?.unreadCount ?? 0;

  const clearChats = () => {
    setChats([]);
    setChatListError("");
    setIsLoadingChats(false);
  };

  const addChat = (chatId: string, number: string) => {
    setChats((current) => current.some((chat) => chat.chatId === chatId)
      ? current
      : [{ id: chatId, chatId, name: `+${number}`, messages: [], unreadCount: 0 }, ...current]);
  };

  const sendMessage = async (chatId: string, text: string, quotedMessageId?: string) => {
    if (!credentials) return;
    const id = await sendText(credentials, chatId, text, quotedMessageId);
    const timestamp = Math.floor(Date.now() / 1000);
    const message: ChatMessage = {
      id,
      direction: "outgoing",
      text,
      timestamp,
      time: messageTime(timestamp),
      quotedId: quotedMessageId,
      status: "pending",
    };
    setChats((current) => current.map((chat) =>
      chat.chatId === chatId
        ? { ...chat, messages: [...chat.messages, message], preview: message }
        : chat,
    ));
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
          .map(toChatMessage)
          .filter((item): item is ChatMessage => item !== null)
          .reverse();

        setChats((current) => current.map((chat) => {
          if (chat.chatId !== activeChatId) return chat;
          const byId = new Map(messages.map((message) => [message.id, message]));
          for (const message of chat.messages) {
            const previous = byId.get(message.id);
            byId.set(message.id, {
              ...previous,
              ...message,
              status: message.status && message.status !== "pending" ? message.status : previous?.status ?? message.status,
            });
          }
          return { ...chat, messages: [...byId.values()].sort((a, b) => a.timestamp - b.timestamp) };
        }));
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

  useEffect(() => {
    if (!credentials || !activeChatId || unreadCount === 0) return;
    const controller = new AbortController();
    let reading = false;

    const markRead = async () => {
      if (document.visibilityState !== "visible" || reading) return;
      reading = true;
      try {
        if (!await readChat(credentials, activeChatId, controller.signal) || controller.signal.aborted) return;
        setChats((current) => current.map((chat) =>
          chat.chatId === activeChatId ? { ...chat, unreadCount: 0 } : chat,
        ));
      } catch {
        // Счётчик остаётся до успешной отметки.
      } finally {
        reading = false;
      }
    };

    void markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", markRead);
    };
  }, [credentials, activeChatId, unreadCount]);

  useEffect(() => {
    if (!credentials) return;
    const controller = new AbortController();

    const listen = async () => {
      while (!controller.signal.aborted) {
        try {
          const notification = await receiveNotification(credentials, controller.signal);
          if (notification === "stop" || controller.signal.aborted) return;
          if (!notification) continue;

          const { body, receiptId } = notification;
          if (body.typeWebhook === "outgoingMessageStatus" && body.idMessage) {
            const status = messageStatus(body.status);
            if (status) {
              setChats((current) => current.map((chat) => ({
                ...chat,
                messages: chat.messages.map((message) => message.id === body.idMessage
                  ? { ...message, status }
                  : message),
              })));
            }
          }
          const incoming = body.typeWebhook === "incomingMessageReceived";
          if (incoming || body.typeWebhook === "outgoingMessageReceived") {
            const chatId = body.senderData?.chatId;
            const text = body.messageData?.textMessageData?.textMessage
              ?? body.messageData?.extendedTextMessageData?.text;
            if (chatId && body.idMessage && typeof text === "string") {
              const timestamp = Number(body.timestamp) || Math.floor(Date.now() / 1000);
              const message: ChatMessage = {
                id: body.idMessage,
                direction: incoming ? "incoming" : "outgoing",
                text,
                timestamp,
                time: messageTime(timestamp),
              };
              setChats((current) => {
                const existing = current.find((chat) => chat.chatId === chatId || chat.aliasChatId === chatId);
                if (!existing) return [{
                  id: chatId,
                  chatId,
                  name: body.senderData?.chatName || chatId,
                  messages: [message],
                  preview: message,
                  unreadCount: incoming ? 1 : 0,
                }, ...current];
                if (existing.messages.some((item) => item.id === message.id)) return current;
                return current.map((chat) => chat.id === existing.id
                  ? {
                    ...chat,
                    messages: [...chat.messages, message],
                    preview: message,
                    unreadCount: chat.unreadCount + (incoming ? 1 : 0),
                  }
                  : chat);
              });
            }
          }

          await deleteNotification(credentials, receiptId, controller.signal);
        } catch (error) {
          if (controller.signal.aborted) return;
          await new Promise((resolve) => setTimeout(resolve, error instanceof Error && error.message.includes("429") ? 30000 : 5000));
        }
      }
    };

    void listen();
    return () => controller.abort();
  }, [credentials]);

  return { chats, isLoadingChats, chatListError, historyError: historyError?.chatId === activeChatId ? historyError.message : "", addChat, sendMessage, clearChats };
}
