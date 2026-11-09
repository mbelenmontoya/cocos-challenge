/** Uppercase because the API's bug modes only match uppercase tickers. */
export function normalizeTicker(text: string): string {
  return text.trim().toUpperCase();
}
