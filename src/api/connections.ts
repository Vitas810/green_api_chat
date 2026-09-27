import type { ConnectionId } from "@/shared/types";

type Connection = {
  name: string;
  apiUrl: string;
  typeInstance: string;
  maxTextLength: number;
};

export const connections: Record<ConnectionId, Connection> = {
  max: {
    name: "MAX",
    apiUrl: "https://3100.api.green-api.com",
    typeInstance: "v3",
    maxTextLength: 4000,
  },
  whatsapp: {
    name: "WhatsApp",
    apiUrl: "https://7107.api.greenapi.com",
    typeInstance: "whatsapp",
    maxTextLength: 20000,
  },
};
