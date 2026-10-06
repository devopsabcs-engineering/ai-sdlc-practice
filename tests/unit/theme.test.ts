import { describe, expect, it } from "vitest";
import { resolveTheme, toggledTheme } from "../../src/ui/theme.ts";

describe("theme preferences", () => {
  it("follows the system only for the default preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("switches to the opposite explicit theme", () => {
    expect(toggledTheme("light")).toBe("dark");
    expect(toggledTheme("dark")).toBe("light");
  });
});
