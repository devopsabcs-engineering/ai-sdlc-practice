import { describe, expect, it } from "vitest";
import { RecipeController } from "../../src/app/recipe-controller.ts";
import { addShoppingCandidates } from "../../src/domain/shopping.ts";
import {
  StateRepository,
  type StoragePort,
} from "../../src/infrastructure/state-repository.ts";

class TestStorage implements StoragePort {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const name = { en: "Sugar", fr: "Sugar" };

describe("shopping merge", () => {
  it("normalizes names and sums compatible units into a practical unit", () => {
    const result = addShoppingCandidates(
      [
        {
          id: "first",
          name,
          quantity: 750,
          unit: "g",
          canonicalDimension: "mass",
          checked: false,
        },
      ],
      [
        {
          name: { en: "  sugar ", fr: " sucre " },
          quantity: 0.5,
          unit: "kg",
          canonicalDimension: "mass",
        },
      ],
      () => "unused",
    );

    expect(result).toEqual([
      {
        id: "first",
        name,
        quantity: 1.25,
        unit: "kg",
        canonicalDimension: "mass",
        checked: false,
      },
    ]);
  });

  it("keeps incompatible dimensions and unknown entries separate", () => {
    let id = 0;
    const result = addShoppingCandidates(
      [],
      [
        { name, quantity: 100, unit: "g", canonicalDimension: "mass" },
        { name, quantity: 1, unit: "cup", canonicalDimension: "volume" },
        { name, quantity: null, unit: null, canonicalDimension: "unknown" },
        { name, quantity: null, unit: null, canonicalDimension: "unknown" },
      ],
      () => `item-${++id}`,
    );

    expect(result).toHaveLength(4);
    expect(result.map(({ canonicalDimension }) => canonicalDimension)).toEqual([
      "mass",
      "volume",
      "unknown",
      "unknown",
    ]);
  });
});

describe("RecipeController shopping commands", () => {
  it("adds current scaled and converted values, then persists merged values", () => {
    const storage = new TestStorage();
    let id = 0;
    const controller = new RecipeController(
      new StateRepository(storage),
      () => new Date("2026-10-06T20:00:00.000Z"),
      () => `generated-${++id}`,
    );
    controller.beginCreate();
    controller.save({
      title: "Cake",
      baseServings: "2",
      ingredients: "500 g flour\n100 g sugar\n1 cup sugar\nsalt, to taste",
      steps: "Mix.",
    });
    controller.setTargetServings(4);
    controller.setUnitSystem("imperial");

    expect(controller.addCurrentIngredients()).toBe(4);
    expect(controller.shoppingItems).toHaveLength(4);
    expect(controller.shoppingItems[0]).toMatchObject({
      name: { en: "flour", fr: "flour" },
      quantity: 2.2046226218487757,
      unit: "lb",
      canonicalDimension: "mass",
    });

    controller.addCurrentIngredients();
    expect(controller.shoppingItems).toHaveLength(5);
    expect(controller.shoppingItems[0]).toMatchObject({
      quantity: 4.409245243697551,
      unit: "lb",
    });
    expect(
      new RecipeController(new StateRepository(storage)).shoppingItems,
    ).toEqual(controller.shoppingItems);
  });

  it("persists checked state and clears only checked items", () => {
    const storage = new TestStorage();
    let id = 0;
    const first = new RecipeController(
      new StateRepository(storage),
      () => new Date("2026-10-06T20:00:00.000Z"),
      () => `generated-${++id}`,
    );
    first.addCurrentIngredients();
    const [checked, unchecked] = first.shoppingItems;
    expect(checked).toBeDefined();
    expect(unchecked).toBeDefined();
    first.setShoppingItemChecked(checked!.id, true);

    const restarted = new RecipeController(new StateRepository(storage));
    expect(
      restarted.shoppingItems.find(({ id }) => id === checked!.id)?.checked,
    ).toBe(true);
    expect(restarted.clearCheckedShoppingItems()).toBe(1);
    expect(restarted.shoppingItems.some(({ id }) => id === checked!.id)).toBe(
      false,
    );
    expect(restarted.shoppingItems.some(({ id }) => id === unchecked!.id)).toBe(
      true,
    );
  });
});
