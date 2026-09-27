import { checkAccount, type Notification, type RawChat } from "@/api/chats";
import { messageStatus, messageTime } from "@/modules/chats/message";
import type { ApiChat, ChatMessage, ApiAccount } from "@/shared/types";

export type ChatEvent =
  | { type: "message"; chatId: string; chatName: string; message: ChatMessage }
  | { type: "status"; messageId: string; status: ChatMessage["status"] };

export function normalizeNotification(notification: Notification): ChatEvent | null {
  const { body } = notification;
  if (body.typeWebhook === "outgoingMessageStatus" && body.idMessage) {
    return { type: "status", messageId: body.idMessage, status: messageStatus(body.status) };
  }

  const incoming = body.typeWebhook === "incomingMessageReceived";
  const outgoing = body.typeWebhook === "outgoingMessageReceived" || body.typeWebhook === "outgoingAPIMessageReceived";
  if (!incoming && !outgoing) return null;

  const chatId = body.senderData?.chatId;
  const data = body.messageData;

  if (!chatId || !body.idMessage || !data) return null;

  let text: string | undefined;

  switch (data.typeMessage) {
    case "textMessage":
      text = data.textMessageData?.textMessage;
      break;
    case "extendedTextMessage":
    case "quotedMessage":
      text = data.extendedTextMessageData?.text;
      break;
    default:
      return null;
  }

  if (typeof text !== "string" || !text.trim()) return null;

  const timestamp = Number(body.timestamp) || Math.floor(Date.now() / 1000);

  return {
    type: "message",
    chatId,
    chatName: body.senderData?.chatName || chatId,
    message: {
      id: body.idMessage,
      direction: incoming ? "incoming" : "outgoing",
      text,
      timestamp,
      time: messageTime(timestamp),
      quotedId: data.extendedTextMessageData?.stanzaId ?? data.quotedMessage?.stanzaId,
    },
  };
}

function normalizeWhatsAppChat(item: RawChat): ApiChat | null {
  if (typeof item.id !== "string") return null;

  let chatId = item.id;
  if (/^\d+$/.test(chatId)) chatId += "@c.us";

  const validChatId = /(@c\.us|@g\.us|@lid)$/;
  if (!validChatId.test(chatId)) return null;

  let aliasChatId: string | null = null;
  if (typeof item.newChatId === "string" && validChatId.test(item.newChatId)) {
    aliasChatId = item.newChatId;
  }

  let name = chatId.replace(/@.*$/, "");
  if (typeof item.name === "string" && item.name.trim()) name = item.name;

  let unreadCount = 0;
  if (Number.isInteger(item.unreadCount)) unreadCount = Number(item.unreadCount);

  return {
    chatId,
    aliasChatId,
    name,
    unreadCount,
  };
}

function normalizeMaxChat(item: RawChat): ApiChat | null {
  if (typeof item.chatId !== "string" || !/^-?\d+$/.test(item.chatId)) return null;

  return {
    chatId: item.chatId,
    aliasChatId: null,
    name: typeof item.name === "string" && item.name.trim() ? item.name : item.chatId,
    unreadCount: 0,
  };
}

async function resolveMaxChatId(apiAccount: ApiAccount, number: string, signal?: AbortSignal) {
  if (!/^(7\d{10}|375\d{9})$/.test(number)) {
    throw new Error("Для MAX укажите номер РФ или РБ в международном формате.");
  }
  const result = await checkAccount(apiAccount, Number(number), signal);

  if (!result || typeof result !== "object") throw new Error("MAX вернул некорректный ответ при проверке номера.");
  const account = result as { exist?: boolean; chatId?: unknown; status?: boolean; reason?: string };

  if (account.status === false) throw new Error(account.reason || "MAX не смог проверить номер.");
  if (account.exist === false) throw new Error("У этого номера нет аккаунта MAX.");
  if (account.exist !== true || typeof account.chatId !== "string" || !/^-?\d+$/.test(account.chatId)) {
    throw new Error("MAX не вернул идентификатор чата.");
  }
  return account.chatId;
}

export function normalizeChat(apiAccount: ApiAccount, item: RawChat): ApiChat | null {
  if (apiAccount.connectionId === "max") return normalizeMaxChat(item);
  return normalizeWhatsAppChat(item);
}

export function resolveChatId(apiAccount: ApiAccount, number: string, signal?: AbortSignal): Promise<string> {
  if (apiAccount.connectionId === "max") return resolveMaxChatId(apiAccount, number, signal);
  return Promise.resolve(`${number}@c.us`);
}
