import { parseIngredientLine, type IngredientLine } from "./ingredient.ts";

export interface Recipe {
  title: string;
  baseServings: number;
  ingredients: IngredientLine[];
  steps: string[];
}

export function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    title: recipe.title,
    baseServings: String(recipe.baseServings),
    ingredients: recipe.ingredients.map((line) => line.original).join("\n"),
    steps: recipe.steps.join("\n"),
  };
}

export interface RecipeDraft {
  title: string;
  baseServings: string;
  ingredients: string;
  steps: string;
}

export type RecipeField = keyof RecipeDraft;
export type RecipeErrors = Partial<Record<RecipeField, string>>;

export type RecipeValidation =
  { ok: true; recipe: Recipe } | { ok: false; errors: RecipeErrors };

function nonEmptyLines(value: string): string[] {
  return value.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

export function validateRecipe(draft: RecipeDraft): RecipeValidation {
  const errors: RecipeErrors = {};
  const title = draft.title.trim();
  const servings = Number(draft.baseServings);
  const ingredientLines = nonEmptyLines(draft.ingredients);
  const steps = nonEmptyLines(draft.steps).map((step) => step.trim());

  if (!title) errors.title = "Enter a recipe title.";
  if (!Number.isInteger(servings) || servings < 1) {
    errors.baseServings = "Enter a whole number of at least 1.";
  }
  if (ingredientLines.length === 0) {
    errors.ingredients = "Enter at least one ingredient line.";
  }
  if (steps.length === 0) errors.steps = "Enter at least one step.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    recipe: {
      title,
      baseServings: servings,
      ingredients: ingredientLines.map(parseIngredientLine),
      steps,
    },
  };
}

export function scaleQuantity(
  quantity: number,
  baseServings: number,
  targetServings: number,
) {
  if (
    !Number.isInteger(targetServings) ||
    targetServings < 1 ||
    targetServings > 99
  ) {
    throw new RangeError(
      "Target servings must be a whole number from 1 to 99.",
    );
  }
  if (!Number.isInteger(baseServings) || baseServings < 1) {
    throw new RangeError("Base servings must be a positive whole number.");
  }
  return (quantity * targetServings) / baseServings;
}
