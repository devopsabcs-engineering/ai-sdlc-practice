import { describe, expect, it } from "vitest";
import { RecipeController } from "../../src/app/recipe-controller.ts";

describe("RecipeController", () => {
  it("does not replace the last valid recipe after an invalid edit", () => {
    const controller = new RecipeController();
    controller.save({
      title: "Soup",
      baseServings: "2",
      ingredients: "1 l stock",
      steps: "Simmer.",
    });
    const saved = controller.savedRecipe;
    controller.save({
      title: "",
      baseServings: "0",
      ingredients: "",
      steps: "",
    });
    expect(controller.savedRecipe).toEqual(saved);
  });

  it("accepts only target serving integers from 1 through 99", () => {
    const controller = new RecipeController();
    controller.save({
      title: "Soup",
      baseServings: "2",
      ingredients: "1 l stock",
      steps: "Simmer.",
    });

    controller.setTargetServings(99);
    expect(controller.targetServings).toBe(99);
    expect(() => controller.setTargetServings(1.5)).toThrow(RangeError);
    expect(() => controller.setTargetServings(100)).toThrow(RangeError);
    expect(controller.targetServings).toBe(99);
  });

  it("tracks the display system without changing the saved recipe", () => {
    const controller = new RecipeController();
    controller.save({
      title: "Soup",
      baseServings: "2",
      ingredients: "1 l stock",
      steps: "Simmer.",
    });
    const saved = controller.savedRecipe;

    controller.setUnitSystem("imperial");

    expect(controller.unitSystem).toBe("imperial");
    expect(controller.savedRecipe).toEqual(saved);
    expect(controller.savedRecipe?.ingredients[0]).toMatchObject({
      quantity: 1,
      unit: "l",
    });
  });
});
