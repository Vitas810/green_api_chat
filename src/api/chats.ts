import { instanceUrl } from "@/api/client";
import type { ApiAccount } from "@/shared/types";

export type RawChat = { id?: string; newChatId?: string; chatId?: string; name?: string; unreadCount?: number };
type ChatsResult = { status: "ok"; chats: RawChat[] } | { status: "rate-limited"; retryAfter: string | null };

export async function getChats(apiAccount: ApiAccount, signal: AbortSignal): Promise<ChatsResult> {
  const response = await fetch(instanceUrl(apiAccount, "getChats"), { signal });

  if (response.status === 429) {
    return { status: "rate-limited", retryAfter: response.headers.get("Retry-After") };
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить чаты: ошибка ${response.status}.`);
  }

  return { status: "ok", chats: (await response.json()) as RawChat[] };
}

export async function getAvatar(
  apiAccount: ApiAccount,
  chatId: string,
  signal: AbortSignal,
): Promise<string | null | "stop"> {
  const response = await fetch(instanceUrl(apiAccount, "getAvatar"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
    signal,
  });

  if (response.status === 466 || response.status === 429) return "stop";
  if (!response.ok) return null;

  const { urlAvatar } = await response.json();
  return urlAvatar ?? null;
}

export type ApiMessage = {
  idMessage: string;
  type: "incoming" | "outgoing";
  typeMessage: string;
  textMessage?: string;
  extendedTextMessage?: { text?: string };
  quotedMessage?: { stanzaId?: string; textMessage?: string; extendedTextMessage?: { text?: string } };
  timestamp: number;
  statusMessage?: string;
};

export async function getChatMessages(
  apiAccount: ApiAccount,
  chatId: string,
  signal: AbortSignal,
  count = 10,
): Promise<ApiMessage[] | "stop"> {
  const response = await fetch(instanceUrl(apiAccount, "getChatHistory"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, count }),
    signal,
  });

  if (response.status === 466 || response.status === 429) return "stop";
  if (!response.ok) throw new Error(`Не удалось загрузить сообщения: ошибка ${response.status}.`);

  const messages = (await response.json()) as ApiMessage[];
  return Array.isArray(messages) ? messages : [];
}

export async function sendText(apiAccount: ApiAccount, chatId: string, message: string, quotedMessageId?: string, signal?: AbortSignal) {
  const response = await fetch(instanceUrl(apiAccount, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message, ...(quotedMessageId ? { quotedMessageId } : {}) }),
    signal,
  });

  if (!response.ok) throw new Error(`Не удалось отправить сообщение: ошибка ${response.status}.`);

  const result = (await response.json()) as { idMessage: string };

  if (!result.idMessage) throw new Error("GREEN-API не вернул идентификатор сообщения.");

  return result.idMessage;
}

export type Notification = {
  receiptId: number;
  body: {
    typeWebhook: string;
    idMessage?: string;
    status?: string;
    timestamp?: number;
    senderData?: { chatId?: string; chatName?: string };
    messageData?: {
      typeMessage?: string;
      textMessageData?: { textMessage?: string };
      extendedTextMessageData?: { text?: string; stanzaId?: string };
      quotedMessage?: { stanzaId?: string };
    };
  };
};

export async function receiveNotification(
  apiAccount: ApiAccount,
  signal: AbortSignal,
): Promise<Notification | null> {
  const response = await fetch(`${instanceUrl(apiAccount, "receiveNotification")}?receiveTimeout=10`, { signal });

  if (!response.ok) {
    if (response.status === 400) {
      const detail = await response.text();
      if (detail.includes("custom webhook url")) {
        throw new Error("Получение уведомлений через HTTP API недоступно: у инстанса указан Webhook URL.");
      }
    }
    throw new Error(`Ошибка получения уведомлений: ${response.status}.`);
  }
  const text = await response.text();

  return text ? (JSON.parse(text) as Notification) : null;
}

export async function deleteNotification(apiAccount: ApiAccount, receiptId: number, signal: AbortSignal) {
  const response = await fetch(`${instanceUrl(apiAccount, "deleteNotification")}/${receiptId}`, {
    method: "DELETE",
    signal,
  });

  if (!response.ok) throw new Error(`Ошибка подтверждения сообщения: ${response.status}.`);
}

export async function readChat(apiAccount: ApiAccount, chatId: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(instanceUrl(apiAccount, "readChat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
    signal,
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { setRead?: boolean };
  return result.setRead === true;
}

export async function checkAccount(apiAccount: ApiAccount, phoneNumber: number, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(instanceUrl(apiAccount, "checkAccount"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
    signal,
  });
  if (!response.ok) throw new Error(`Не удалось проверить номер MAX: ошибка ${response.status}.`);
  return response.json();
}
