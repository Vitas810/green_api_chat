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

export async function getAvatar(credentials: Credentials, chatId: string, signal: AbortSignal): Promise<string | null | "stop"> {
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
  typeMessage: string;
  textMessage?: string;
  extendedTextMessage?: { text?: string };
  timestamp: number;
};

export async function getChatMessages(
  credentials: Credentials,
  chatId: string,
  signal: AbortSignal,
): Promise<ApiMessage[] | "stop"> {
  const response = await fetch(instanceUrl(credentials, "getChatHistory"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, count: 10 }),
    signal,
  });

  if (response.status === 466 || response.status === 429) return "stop";
  if (!response.ok) return [];

  const messages = (await response.json()) as ApiMessage[];
  return Array.isArray(messages) ? messages : [];
}
