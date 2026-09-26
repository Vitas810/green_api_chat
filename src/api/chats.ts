import { instanceUrl } from "@/api/client";
import type { ApiChat, Credentials } from "@/shared/types";

type ChatsResult = { status: "ok"; chats: ApiChat[] } | { status: "rate-limited"; retryAfter: string | null };

export async function getChats(credentials: Credentials, signal: AbortSignal): Promise<ChatsResult> {
  const response = await fetch(instanceUrl(credentials, "getChats"), { signal });

  if (response.status === 429) {
    return { status: "rate-limited", retryAfter: response.headers.get("Retry-After") };
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить чаты: ошибка ${response.status}.`);
  }

  return { status: "ok", chats: (await response.json()) as ApiChat[] };
}

export async function getAvatar(
  credentials: Credentials,
  chatId: string,
  signal: AbortSignal,
): Promise<string | null | "stop"> {
  const response = await fetch(instanceUrl(credentials, "getAvatar"), {
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
  timestamp: number;
  statusMessage?: string;
};

export async function getChatMessages(
  credentials: Credentials,
  chatId: string,
  signal: AbortSignal,
  count = 10,
): Promise<ApiMessage[] | "stop"> {
  const response = await fetch(instanceUrl(credentials, "getChatHistory"), {
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

export async function sendText(credentials: Credentials, chatId: string, message: string, quotedMessageId?: string) {
  const response = await fetch(instanceUrl(credentials, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message, ...(quotedMessageId ? { quotedMessageId } : {}) }),
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
      extendedTextMessageData?: { text?: string };
    };
  };
};

export async function receiveNotification(
  credentials: Credentials,
  signal: AbortSignal,
): Promise<Notification | null | "stop"> {
  const response = await fetch(`${instanceUrl(credentials, "receiveNotification")}?receiveTimeout=10`, { signal });

  if (response.status === 466) return "stop";
  if (!response.ok) throw new Error(`Ошибка получения сообщений: ${response.status}.`);
  const text = await response.text();

  return text ? (JSON.parse(text) as Notification) : null;
}

export async function deleteNotification(credentials: Credentials, receiptId: number, signal: AbortSignal) {
  const response = await fetch(`${instanceUrl(credentials, "deleteNotification")}/${receiptId}`, {
    method: "DELETE",
    signal,
  });

  if (!response.ok) throw new Error(`Ошибка подтверждения сообщения: ${response.status}.`);
}

export async function readChat(credentials: Credentials, chatId: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(instanceUrl(credentials, "readChat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
    signal,
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { setRead?: boolean };
  return result.setRead === true;
}
