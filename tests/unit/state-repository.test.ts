import { describe, expect, it } from "vitest";
import { RecipeController } from "../../src/app/recipe-controller.ts";
import {
  RECOVERY_KEY,
  STATE_KEY,
  StateRepository,
  createDefaultState,
  type StoragePort,
} from "../../src/infrastructure/state-repository.ts";

class TestStorage implements StoragePort {
  readonly values = new Map<string, string>();
  writes = 0;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.writes += 1;
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const draft = {
  title: "My soup",
  baseServings: "2",
  ingredients: "500 ml stock",
  steps: "Simmer.",
};

describe("StateRepository", () => {
  it("seeds exactly three explicit bilingual samples and defaults", () => {
    const state = new StateRepository(new TestStorage()).load().state;

    expect(state.recipes).toHaveLength(3);
    expect(state.recipes.every(({ source }) => source === "sample")).toBe(true);
    for (const recipe of state.recipes) {
      expect(recipe.title.en).not.toBe("");
      expect(recipe.title.fr).not.toBe("");
      expect(
        recipe.ingredients.every(
          (line) => line.original.en && line.original.fr,
        ),
      ).toBe(true);
      expect(
        recipe.steps.every((step) => step.en !== "" && step.fr !== ""),
      ).toBe(true);
    }
    expect(state.shoppingItems).toEqual([]);
    expect(state.preferences).toMatchObject({
      locale: "en",
      unitSystem: "metric",
      theme: "system",
      selectedRecipeId: state.recipes[0]?.id,
    });
  });

  it("persists recipes and the selected reference across repository instances", () => {
    const storage = new TestStorage();
    const first = new RecipeController(
      new StateRepository(storage),
      () => new Date("2026-10-06T20:00:00.000Z"),
      () => "user-recipe",
    );
    first.beginCreate();
    first.save(draft);

    const second = new RecipeController(new StateRepository(storage));
    expect(second.selectedRecipeId).toBe("user-recipe");
    expect(second.savedRecipe?.title).toBe("My soup");
    expect(second.recipes).toHaveLength(4);
  });

  it("persists language and theme preferences across repository instances", () => {
    const storage = new TestStorage();
    const first = new RecipeController(new StateRepository(storage));

    first.setLocale("fr");
    first.setTheme("dark");

    const second = new RecipeController(new StateRepository(storage));
    expect(second.locale).toBe("fr");
    expect(second.theme).toBe("dark");
    expect(second.savedRecipe?.title).toBe("Crêpes de semaine");
  });

  it("retains invalid stored data for recovery before restoring defaults", () => {
    const storage = new TestStorage();
    storage.setItem(STATE_KEY, '{"schemaVersion":99}');

    const loaded = new StateRepository(storage).load();

    expect(loaded.recovered).toBe(true);
    expect(storage.getItem(RECOVERY_KEY)).toBe('{"schemaVersion":99}');
    expect(loaded.state.recipes).toHaveLength(3);
  });

  it("exports all state collections with a version and timestamp", () => {
    const repository = new StateRepository(new TestStorage());
    const state = repository.load().state;
    const exported = JSON.parse(
      repository.exportJson(state, new Date("2026-10-06T20:00:00.000Z")),
    ) as Record<string, unknown>;

    expect(Object.keys(exported).sort()).toEqual([
      "exportedAt",
      "preferences",
      "recipes",
      "schemaVersion",
      "shoppingItems",
    ]);
    expect(exported.schemaVersion).toBe(1);
    expect(exported.exportedAt).toBe("2026-10-06T20:00:00.000Z");
  });

  it("validates an import fully before one replacement write", () => {
    const storage = new TestStorage();
    const repository = new StateRepository(storage);
    const state = repository.load().state;
    const json = repository.exportJson(state);
    const writesBefore = storage.writes;

    expect(repository.importJson(json)).toEqual(state);
    expect(storage.writes - writesBefore).toBe(1);
  });

  it.each([
    "not json",
    '{"schemaVersion":2}',
    JSON.stringify({
      ...createDefaultState(),
      exportedAt: "2026-10-06T20:00:00.000Z",
      preferences: {
        ...createDefaultState().preferences,
        selectedRecipeId: "missing",
      },
    }),
  ])("leaves stored data unchanged for invalid import %s", (json) => {
    const storage = new TestStorage();
    const repository = new StateRepository(storage);
    repository.load();
    const before = storage.getItem(STATE_KEY);
    const writesBefore = storage.writes;

    expect(repository.importJson(json)).toBeNull();
    expect(storage.getItem(STATE_KEY)).toBe(before);
    expect(storage.writes).toBe(writesBefore);
  });

  it("clears primary and recovery data before restoring samples", () => {
    const storage = new TestStorage();
    const repository = new StateRepository(storage);
    repository.load();
    storage.setItem(RECOVERY_KEY, "old");

    const reset = repository.clear();

    expect(reset.recipes).toHaveLength(3);
    expect(storage.getItem(RECOVERY_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(STATE_KEY) ?? "{}")).toEqual(reset);
  });
});

describe("RecipeController library commands", () => {
  it("avoids sample and existing identifiers when creating recipes", () => {
    const storage = new TestStorage();
    const ids = ["sample-weeknight-crepes", "sample-tomato-soup", "unique"];
    const controller = new RecipeController(
      new StateRepository(storage),
      () => new Date("2026-10-06T20:00:00.000Z"),
      () => ids.shift() ?? "unexpected",
    );

    controller.beginCreate();
    controller.save(draft);

    expect(controller.selectedRecipeId).toBe("unique");
    expect(new Set(controller.recipes.map(({ id }) => id)).size).toBe(4);
  });

  it("deleting the selected recipe chooses a valid reference, including empty", () => {
    const controller = new RecipeController(
      new StateRepository(new TestStorage()),
    );

    while (controller.recipes.length > 0) {
      const selected = controller.selectedRecipeId;
      expect(controller.delete(selected)).toBe(true);
      expect(
        controller.selectedRecipeId === "" ||
          controller.recipes.some(
            ({ id }) => id === controller.selectedRecipeId,
          ),
      ).toBe(true);
    }
    expect(controller.selectedRecipeId).toBe("");
    expect(controller.savedRecipe).toBeNull();
  });
});
