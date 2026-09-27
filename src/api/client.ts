import { connections } from "@/api/connections";
import type { ApiAccount } from "@/shared/types";

export function instanceUrl({ connectionId, credentials }: ApiAccount, method: string) {
  const { idInstance, apiTokenInstance } = credentials;
  return `${connections[connectionId].apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`;
}
