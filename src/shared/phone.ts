export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (!/^[789]/.test(digits)) return `+${digits.slice(0, 16)}`;

  const rest = (digits.startsWith("9") ? digits : digits.slice(1)).slice(0, 10);
  let formatted = "+7";
  if (rest.slice(0, 3)) formatted += ` ${rest.slice(0, 3)}`;
  if (rest.slice(3, 6)) formatted += ` ${rest.slice(3, 6)}`;
  if (rest.slice(6, 8)) formatted += `-${rest.slice(6, 8)}`;
  if (rest.slice(8, 10)) formatted += `-${rest.slice(8, 10)}`;
  return formatted;
}

export function getChatNumber(phone: string) {
  let number = phone.replace(/\D/g, "");
  if (number.length === 11 && number.startsWith("8")) number = `7${number.slice(1)}`;
  return number.length >= 11 && number.length <= 16 ? number : null;
}
