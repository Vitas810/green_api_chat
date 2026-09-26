import { instanceUrl } from "@/api/client";
import type { Credentials, InstanceSettings } from "@/shared/types";

export async function getSettings(credentials: Credentials): Promise<InstanceSettings> {
  const response = await fetch(instanceUrl(credentials, "getSettings"));
  if (!response.ok) {
    throw new Error(`GREEN-API вернул ошибку ${response.status}. Проверьте данные инстанса.`);
  }

  const settings: unknown = await response.json();
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Некорректный ответ GREEN-API.");
  }
  return settings as InstanceSettings;
}
