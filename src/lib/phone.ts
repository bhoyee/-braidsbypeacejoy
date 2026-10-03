// US phone numbers (NANP), shared by the booking form and the checkout API.

/** The 10 national digits, dropping a leading country code 1 and anything past 10 digits. */
export function usPhoneDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("1")) d = d.slice(1);
  return d.slice(0, 10);
}

/** Formats as the user types: "410" → "(410", "4105550" → "(410) 555-0", full → "(410) 555-0123". */
export function formatUsPhone(input: string): string {
  const d = usPhoneDigits(input);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Valid US number: 10 digits, area code and exchange can't start with 0 or 1. */
export function isValidUsPhone(input: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(usPhoneDigits(input));
}
