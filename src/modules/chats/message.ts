import type { ApiMessage } from "@/api/chats";
import type { ChatMessage } from "@/shared/types";

export function messageStatus(value?: string): ChatMessage["status"] {
  if (value === "failed" || value === "noAccount" || value === "notInGroup") return "error";
  if (value === "sent" || value === "delivered" || value === "read") return value;
}

export function latestStatus(
  current: ChatMessage["status"],
  incoming: ChatMessage["status"],
): ChatMessage["status"] {
  if (current === "error" || incoming === "error") return "error";
  const rank = { pending: 0, sent: 1, delivered: 2, read: 3 };
  if (!current) return incoming;
  if (!incoming) return current;
  return rank[incoming] > rank[current] ? incoming : current;
}

export function messageTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

export function toChatMessage(item: ApiMessage): ChatMessage | null {
  if (!["textMessage", "extendedTextMessage", "quotedMessage"].includes(item.typeMessage)) return null;
  const text = item.textMessage || item.extendedTextMessage?.text;
  const timestamp = Number(item.timestamp);
  if (!text?.trim() || !item.idMessage || !Number.isFinite(timestamp)) return null;

  return {
    id: item.idMessage,
    direction: item.type,
    text,
    timestamp,
    time: messageTime(timestamp),
    status: item.type === "outgoing" ? messageStatus(item.statusMessage) : undefined,
    quotedId: item.quotedMessage?.stanzaId,
    quotedText: item.quotedMessage?.textMessage ?? item.quotedMessage?.extendedTextMessage?.text,
  };
}
