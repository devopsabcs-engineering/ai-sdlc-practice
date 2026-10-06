import { describe, expect, it } from "vitest";
import { formatQuantity } from "../../src/ui/format-quantity.ts";

describe("formatQuantity", () => {
  it("uses familiar fractions for natural household quantities", () => {
    expect(formatQuantity(1.5, "cup")).toBe("1 ½");
    expect(formatQuantity(0.25, null)).toBe("¼");
  });

  it("uses locale-aware decimals for other quantities", () => {
    expect(formatQuantity(1.2, "cup", "fr")).toBe("1,2");
  });

  it("rounds gram and millilitre results to practical precision", () => {
    expect(formatQuantity(125.4, "g")).toBe("125");
    expect(formatQuantity(333.8, "ml")).toBe("334");
  });
});
