import type { ThemePreference } from "../domain/library.ts";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  return preference === "system"
    ? systemPrefersDark
      ? "dark"
      : "light"
    : preference;
}

export function toggledTheme(current: ResolvedTheme): ResolvedTheme {
  return current === "dark" ? "light" : "dark";
}
