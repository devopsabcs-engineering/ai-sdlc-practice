import { describe, expect, it } from "vitest";
import { scaleQuantity, validateRecipe } from "../../src/domain/recipe.ts";

const validDraft = {
  title: "Pancakes",
  baseServings: "4",
  ingredients: "2 eggs\nsalt, to taste\n1 1/2 cups milk",
  steps: "Mix.\nCook.",
};

describe("validateRecipe", () => {
  it("creates a recipe while preserving line and step order", () => {
    const result = validateRecipe(validDraft);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recipe.ingredients.map((line) => line.original)).toEqual([
        "2 eggs",
        "salt, to taste",
        "1 1/2 cups milk",
      ]);
      expect(result.recipe.steps).toEqual(["Mix.", "Cook."]);
    }
  });

  it("associates errors with every missing field", () => {
    const result = validateRecipe({
      title: "",
      baseServings: "1.5",
      ingredients: "",
      steps: "",
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        title: "Enter a recipe title.",
        baseServings: "Enter a whole number of at least 1.",
        ingredients: "Enter at least one ingredient line.",
        steps: "Enter at least one step.",
      },
    });
  });
});

describe("scaleQuantity", () => {
  it("scales without mutating source values", () => {
    expect(scaleQuantity(1.5, 4, 6)).toBe(2.25);
  });

  it.each([0, 100, 2.5, Number.NaN])(
    "rejects target serving count %s",
    (target) => {
      expect(() => scaleQuantity(1, 4, target)).toThrow(RangeError);
    },
  );
});
