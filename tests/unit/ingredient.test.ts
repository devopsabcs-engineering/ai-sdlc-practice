import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../../src/domain/ingredient.ts";

describe("parseIngredientLine", () => {
  it.each([
    ["2 eggs", 2, null, "eggs"],
    ["0.5 l milk", 0.5, "l", "milk"],
    ["1/2 cup sugar", 0.5, "cup", "sugar"],
    ["1 1/2 tbsp oil", 1.5, "tbsp", "oil"],
    ["250 grams flour", 250, "g", "flour"],
    ["8 US fl oz stock", 8, "fl oz", "stock"],
  ])("parses %s", (line, quantity, unit, name) => {
    expect(parseIngredientLine(line)).toEqual({
      kind: "parsed",
      original: line,
      quantity,
      unit,
      name,
    });
  });

  it.each(["1/0 cup flour", "2", "0 eggs", "salt, to taste", "1 cup"])(
    "preserves invalid or unsupported input %s",
    (line) =>
      expect(parseIngredientLine(line)).toEqual({
        kind: "unparsed",
        original: line,
      }),
  );

  it("preserves whitespace in the original line", () => {
    expect(parseIngredientLine("  2 eggs  ")).toMatchObject({
      original: "  2 eggs  ",
    });
  });

  it.each([
    "1 2/1 cups flour",
    "1 1/0 cups flour",
    "999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999 ingredient",
  ])("fails safely and preserves malformed quantity %s", (line) => {
    expect(parseIngredientLine(line)).toEqual({
      kind: "unparsed",
      original: line,
    });
  });
});
