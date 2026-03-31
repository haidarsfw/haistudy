import id from "./id";
import en from "./en";

export type Locale = "id" | "en";

const dictionaries: Record<Locale, Record<string, string>> = { id, en };

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] || dictionaries.id[key] || key;
}

export function createTranslator(locale: Locale) {
  return (key: string) => translate(locale, key);
}
