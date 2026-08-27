const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

export function money(code?: string): string {
  return code ? (SYMBOLS[code] ?? code) : "$";
}
