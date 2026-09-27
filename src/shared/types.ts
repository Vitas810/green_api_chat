export type ChatMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  text: string;
  time: string;
  timestamp: number;
  status?: "pending" | "sent" | "delivered" | "read" | "error";
  quotedId?: string;
  quotedText?: string;
};

export type Chat = {
  id: string;
  chatId?: string;
  aliasChatId?: string | null;
  name: string;
  avatar?: string;
  messages: ChatMessage[];
  preview?: ChatMessage;
  previewLoaded?: boolean;
  unreadCount: number;
};

export type Credentials = {
  idInstance: string;
  apiTokenInstance: string;
};

export type ConnectionId = "max" | "whatsapp";

export type ApiAccount = {
  connectionId: ConnectionId;
  credentials: Credentials;
};

export type ApiChat = {
  chatId: string;
  aliasChatId: string | null;
  name: string;
  unreadCount: number;
};
