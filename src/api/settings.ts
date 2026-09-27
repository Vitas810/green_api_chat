import { instanceUrl } from "@/api/client";
import { connections } from "@/api/connections";
import type { ApiAccount } from "@/shared/types";

export async function getSettings(apiAccount: ApiAccount): Promise<void> {
  const response = await fetch(instanceUrl(apiAccount, "getSettings"));
  if (!response.ok) {
    throw new Error(`GREEN-API вернул ошибку ${response.status}. Проверьте данные инстанса.`);
  }

  const settings: unknown = await response.json();
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Некорректный ответ GREEN-API.");
  }
  const typeInstance = (settings as { typeInstance?: unknown }).typeInstance;
  const expectedType = connections[apiAccount.connectionId].typeInstance;

  const matches = expectedType === "whatsapp"
    ? typeInstance === undefined || typeInstance === expectedType
    : typeInstance === expectedType;
  if (!matches) {
    throw new Error(`Этот инстанс не относится к ${connections[apiAccount.connectionId].name}. Проверьте выбор сервиса и данные входа.`);
  }
}
