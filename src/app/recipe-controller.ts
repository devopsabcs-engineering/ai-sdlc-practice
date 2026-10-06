import {
  scaleQuantity,
  validateRecipe,
  type Recipe,
  type RecipeDraft,
  type RecipeValidation,
} from "../domain/recipe.ts";
import type { UnitSystem } from "../domain/unit-conversion.ts";

export class RecipeController {
  #saved: Recipe | null = null;
  #targetServings = 1;
  #unitSystem: UnitSystem = "metric";

  get savedRecipe() {
    return this.#saved;
  }

  get targetServings() {
    return this.#targetServings;
  }

  get unitSystem() {
    return this.#unitSystem;
  }

  save(draft: RecipeDraft): RecipeValidation {
    const result = validateRecipe(draft);
    if (result.ok) {
      this.#saved = result.recipe;
      this.#targetServings = result.recipe.baseServings;
    }
    return result;
  }

  setTargetServings(value: number) {
    if (!this.#saved) return;
    scaleQuantity(1, this.#saved.baseServings, value);
    this.#targetServings = value;
  }

  setUnitSystem(value: UnitSystem) {
    this.#unitSystem = value;
  }
}
