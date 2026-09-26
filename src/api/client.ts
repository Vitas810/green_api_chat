import type { Credentials } from "@/shared/types";

const apiUrl = "https://7107.api.greenapi.com";

export function instanceUrl({ idInstance, apiTokenInstance }: Credentials, method: string) {
  return `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`;
}
