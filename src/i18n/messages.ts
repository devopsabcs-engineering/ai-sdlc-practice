import en from "./en.json";
import fr from "./fr.json";
import type { Locale } from "../domain/library.ts";

export type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

const catalogs: Record<Locale, Catalog> = { en, fr };

export function createTranslator(locale: Locale) {
  return (
    key: MessageKey,
    replacements: Record<string, string | number> = {},
  ): string =>
    Object.entries(replacements).reduce(
      (message, [name, value]) =>
        message.replaceAll(`{${name}}`, String(value)),
      catalogs[locale][key],
    );
}
