import { readFile } from "node:fs/promises";

const load = async (locale) =>
  JSON.parse(
    await readFile(
      new URL(`../src/i18n/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );

const [english, french] = await Promise.all([load("en"), load("fr")]);
const englishKeys = Object.keys(english).sort();
const frenchKeys = Object.keys(french).sort();
const failures = [];

for (const key of englishKeys) {
  if (!(key in french)) failures.push(`fr is missing "${key}"`);
}
for (const key of frenchKeys) {
  if (!(key in english)) failures.push(`fr has extra key "${key}"`);
}
for (const [locale, catalog] of [
  ["en", english],
  ["fr", french],
]) {
  for (const [key, value] of Object.entries(catalog)) {
    if (typeof value !== "string" || value.trim() === "") {
      failures.push(`${locale} has an empty or non-string value for "${key}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(`i18n parity failed:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(
    `i18n parity verified (${englishKeys.length} messages per locale).`,
  );
}
