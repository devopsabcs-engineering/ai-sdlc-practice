import {
  localizeIngredient,
  type LibraryRecipe,
  type Locale,
  type PersistedStateV1,
} from "../domain/library.ts";
import {
  scaleQuantity,
  validateRecipe,
  type Recipe,
  type RecipeDraft,
  type RecipeValidation,
} from "../domain/recipe.ts";
import { addShoppingCandidates } from "../domain/shopping.ts";
import {
  convertToUnitSystem,
  getUnitDimension,
  type UnitSystem,
} from "../domain/unit-conversion.ts";
import {
  StateRepository,
  type StoragePort,
} from "../infrastructure/state-repository.ts";

class MemoryStorage implements StoragePort {
  readonly #values = new Map<string, string>();
  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }
  removeItem(key: string) {
    this.#values.delete(key);
  }
}

function defaultRepository(): StateRepository {
  const storage =
    typeof window === "undefined" ? new MemoryStorage() : window.localStorage;
  return new StateRepository(storage);
}

function toRecipe(recipe: LibraryRecipe, locale: Locale): Recipe {
  return {
    title: recipe.title[locale],
    baseServings: recipe.baseServings,
    ingredients: recipe.ingredients.map((line) =>
      localizeIngredient(line, locale),
    ),
    steps: recipe.steps.map((step) => step[locale]),
  };
}

function localized(value: string) {
  return { en: value, fr: value };
}

export class RecipeController {
  #state: PersistedStateV1;
  #targetServings = 1;
  #creating = false;
  readonly recoveredOnLoad: boolean;

  constructor(
    private readonly repository = defaultRepository(),
    private readonly now: () => Date = () => new Date(),
    private readonly uuid: () => string = () => {
      if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
      }
      return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    },
  ) {
    const loaded = repository.load();
    this.#state = loaded.state;
    this.recoveredOnLoad = loaded.recovered;
    this.#targetServings = this.savedRecipe?.baseServings ?? 1;
  }

  get savedRecipe(): Recipe | null {
    if (this.#creating) return null;
    const selected = this.#state.recipes.find(
      ({ id }) => id === this.#state.preferences.selectedRecipeId,
    );
    return selected ? toRecipe(selected, this.#state.preferences.locale) : null;
  }

  get recipes(): readonly LibraryRecipe[] {
    return this.#state.recipes;
  }

  get selectedRecipeId(): string {
    return this.#state.preferences.selectedRecipeId;
  }

  get locale(): Locale {
    return this.#state.preferences.locale;
  }

  get targetServings() {
    return this.#targetServings;
  }

  get unitSystem() {
    return this.#state.preferences.unitSystem;
  }

  get shoppingItems() {
    return this.#state.shoppingItems;
  }

  save(draft: RecipeDraft): RecipeValidation {
    const result = validateRecipe(draft);
    if (!result.ok) return result;

    const current = this.#state.recipes.find(
      ({ id }) => id === this.#state.preferences.selectedRecipeId,
    );
    const id = this.#creating || !current ? this.#createId() : current.id;
    const recipe: LibraryRecipe = {
      id,
      title: localized(result.recipe.title),
      baseServings: result.recipe.baseServings,
      ingredients: result.recipe.ingredients.map((line) =>
        line.kind === "unparsed"
          ? { kind: "unparsed", original: localized(line.original) }
          : {
              kind: "parsed",
              original: localized(line.original),
              quantity: line.quantity,
              unit: line.unit,
              name: localized(line.name),
            },
      ),
      steps: result.recipe.steps.map(localized),
      source: "user",
      updatedAt: this.now().toISOString(),
    };
    const recipes =
      this.#creating || !current
        ? [...this.#state.recipes, recipe]
        : this.#state.recipes.map((item) => (item.id === id ? recipe : item));
    this.#commit({
      ...this.#state,
      recipes,
      preferences: { ...this.#state.preferences, selectedRecipeId: id },
    });
    this.#creating = false;
    this.#targetServings = recipe.baseServings;
    return { ok: true, recipe: result.recipe };
  }

  beginCreate(): void {
    this.#creating = true;
    this.#targetServings = 1;
  }

  open(id: string): boolean {
    const recipe = this.#state.recipes.find((item) => item.id === id);
    if (!recipe) return false;
    this.#commit({
      ...this.#state,
      preferences: { ...this.#state.preferences, selectedRecipeId: id },
    });
    this.#creating = false;
    this.#targetServings = recipe.baseServings;
    return true;
  }

  delete(id: string): boolean {
    if (!this.#state.recipes.some((recipe) => recipe.id === id)) return false;
    const recipes = this.#state.recipes.filter((recipe) => recipe.id !== id);
    const selectedRecipeId =
      this.#state.preferences.selectedRecipeId === id
        ? (recipes[0]?.id ?? "")
        : this.#state.preferences.selectedRecipeId;
    this.#commit({
      ...this.#state,
      recipes,
      preferences: { ...this.#state.preferences, selectedRecipeId },
    });
    this.#creating = false;
    this.#targetServings = this.savedRecipe?.baseServings ?? 1;
    return true;
  }

  setTargetServings(value: number) {
    const saved = this.savedRecipe;
    if (!saved) return;
    scaleQuantity(1, saved.baseServings, value);
    this.#targetServings = value;
  }

  setUnitSystem(value: UnitSystem) {
    if (value === this.#state.preferences.unitSystem) return;
    this.#commit({
      ...this.#state,
      preferences: { ...this.#state.preferences, unitSystem: value },
    });
  }

  addCurrentIngredients(): number {
    if (this.#creating) return 0;
    const recipe = this.#state.recipes.find(
      ({ id }) => id === this.#state.preferences.selectedRecipeId,
    );
    if (!recipe) return 0;
    const candidates = recipe.ingredients.map((line) => {
      if (line.kind === "unparsed") {
        return {
          name: line.original,
          quantity: null,
          unit: null,
          canonicalDimension: "unknown" as const,
        };
      }
      const scaled = scaleQuantity(
        line.quantity,
        recipe.baseServings,
        this.#targetServings,
      );
      const displayed = convertToUnitSystem(scaled, line.unit, this.unitSystem);
      return {
        name: line.name,
        quantity: displayed.quantity,
        unit: displayed.unit,
        canonicalDimension: displayed.unit
          ? getUnitDimension(displayed.unit)
          : ("count" as const),
      };
    });
    const usedIds = new Set(this.#state.shoppingItems.map(({ id }) => id));
    const createId = () => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = this.uuid();
        if (candidate && !usedIds.has(candidate)) {
          usedIds.add(candidate);
          return candidate;
        }
      }
      throw new Error("Unable to create a unique shopping item identifier.");
    };
    this.#commit({
      ...this.#state,
      shoppingItems: addShoppingCandidates(
        this.#state.shoppingItems,
        candidates,
        createId,
      ),
    });
    return candidates.length;
  }

  setShoppingItemChecked(id: string, checked: boolean): boolean {
    if (!this.#state.shoppingItems.some((item) => item.id === id)) return false;
    this.#commit({
      ...this.#state,
      shoppingItems: this.#state.shoppingItems.map((item) =>
        item.id === id ? { ...item, checked } : item,
      ),
    });
    return true;
  }

  clearCheckedShoppingItems(): number {
    const shoppingItems = this.#state.shoppingItems.filter(
      ({ checked }) => !checked,
    );
    const removed = this.#state.shoppingItems.length - shoppingItems.length;
    if (removed > 0) this.#commit({ ...this.#state, shoppingItems });
    return removed;
  }

  exportJson(): string {
    return this.repository.exportJson(this.#state, this.now());
  }

  importJson(json: string): boolean {
    const imported = this.repository.importJson(json);
    if (!imported) return false;
    this.#state = imported;
    this.#creating = false;
    this.#targetServings = this.savedRecipe?.baseServings ?? 1;
    return true;
  }

  clearAll(): void {
    this.#state = this.repository.clear();
    this.#creating = false;
    this.#targetServings = this.savedRecipe?.baseServings ?? 1;
  }

  #createId(): string {
    const existing = new Set(this.#state.recipes.map(({ id }) => id));
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = this.uuid();
      if (candidate && !existing.has(candidate)) return candidate;
    }
    throw new Error("Unable to create a unique recipe identifier.");
  }

  #commit(next: PersistedStateV1): void {
    this.repository.replace(next);
    this.#state = next;
  }
}
