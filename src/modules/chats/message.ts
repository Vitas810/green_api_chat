import type { ApiMessage } from "@/api/chats";
import type { ChatMessage } from "@/shared/types";

export function messageStatus(value?: string): ChatMessage["status"] {
  if (value === "failed") return "error";
  if (value === "sent" || value === "delivered" || value === "read") return value;
}

export function messageTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

export function toChatMessage(item: ApiMessage): ChatMessage | null {
  if (item.typeMessage !== "textMessage" && item.typeMessage !== "extendedTextMessage") return null;
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
  };
}
