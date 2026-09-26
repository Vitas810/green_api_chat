import { instanceUrl } from "@/api/client";
import type { ApiChat, Credentials } from "@/shared/types";

type ChatsResult =
  | { status: "ok"; chats: ApiChat[] }
  | { status: "rate-limited"; retryAfter: string | null };

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
