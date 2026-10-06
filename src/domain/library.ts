import {
  supportedUnits,
  type IngredientLine,
  type SupportedUnit,
} from "./ingredient.ts";
import type { UnitSystem } from "./unit-conversion.ts";

export type Locale = "en" | "fr";
export type ThemePreference = "system" | "light" | "dark";
export type RecipeSource = "sample" | "user";

export interface LocalizedText {
  en: string;
  fr: string;
}

export type LocalizedIngredientLine =
  | {
      kind: "parsed";
      original: LocalizedText;
      quantity: number;
      unit: SupportedUnit | null;
      name: LocalizedText;
    }
  | { kind: "unparsed"; original: LocalizedText };

export interface LibraryRecipe {
  id: string;
  title: LocalizedText;
  baseServings: number;
  ingredients: LocalizedIngredientLine[];
  steps: LocalizedText[];
  source: RecipeSource;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: LocalizedText;
  quantity: number | null;
  unit: SupportedUnit | null;
  canonicalDimension: "mass" | "volume" | "count" | "unknown";
  checked: boolean;
}

export interface Preferences {
  locale: Locale;
  unitSystem: UnitSystem;
  theme: ThemePreference;
  selectedRecipeId: string;
}

export interface PersistedStateV1 {
  schemaVersion: 1;
  recipes: LibraryRecipe[];
  shoppingItems: ShoppingItem[];
  preferences: Preferences;
}

export interface PinchExportV1 extends PersistedStateV1 {
  exportedAt: string;
}

const dimensions = ["mass", "volume", "count", "unknown"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === required.length &&
    [...required].sort().every((key, index) => actual[index] === key)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["en", "fr"]) &&
    isNonEmptyString(value.en) &&
    isNonEmptyString(value.fr)
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
}

function isSupportedUnit(value: unknown): value is SupportedUnit | null {
  return (
    value === null ||
    (typeof value === "string" &&
      supportedUnits.includes(value as SupportedUnit))
  );
}

function isIngredient(value: unknown): value is LocalizedIngredientLine {
  if (!isRecord(value) || !isLocalizedText(value.original)) return false;
  if (value.kind === "unparsed" && hasOnlyKeys(value, ["kind", "original"])) {
    return true;
  }
  return (
    value.kind === "parsed" &&
    hasOnlyKeys(value, ["kind", "original", "quantity", "unit", "name"]) &&
    typeof value.quantity === "number" &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0 &&
    isSupportedUnit(value.unit) &&
    isLocalizedText(value.name)
  );
}

function isRecipe(value: unknown): value is LibraryRecipe {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "title",
      "baseServings",
      "ingredients",
      "steps",
      "source",
      "updatedAt",
    ]) &&
    isNonEmptyString(value.id) &&
    isLocalizedText(value.title) &&
    Number.isInteger(value.baseServings) &&
    (value.baseServings as number) > 0 &&
    Array.isArray(value.ingredients) &&
    value.ingredients.length > 0 &&
    value.ingredients.every(isIngredient) &&
    Array.isArray(value.steps) &&
    value.steps.length > 0 &&
    value.steps.every(isLocalizedText) &&
    (value.source === "sample" || value.source === "user") &&
    isIsoDate(value.updatedAt)
  );
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "name",
      "quantity",
      "unit",
      "canonicalDimension",
      "checked",
    ]) &&
    isNonEmptyString(value.id) &&
    isLocalizedText(value.name) &&
    (value.quantity === null ||
      (typeof value.quantity === "number" &&
        Number.isFinite(value.quantity) &&
        value.quantity > 0)) &&
    isSupportedUnit(value.unit) &&
    typeof value.canonicalDimension === "string" &&
    dimensions.includes(
      value.canonicalDimension as (typeof dimensions)[number],
    ) &&
    typeof value.checked === "boolean"
  );
}

function isPreferences(value: unknown): value is Preferences {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["locale", "unitSystem", "theme", "selectedRecipeId"]) &&
    (value.locale === "en" || value.locale === "fr") &&
    (value.unitSystem === "metric" || value.unitSystem === "imperial") &&
    (value.theme === "system" ||
      value.theme === "light" ||
      value.theme === "dark") &&
    typeof value.selectedRecipeId === "string"
  );
}

function hasUniqueIds(values: { id: string }[]): boolean {
  return new Set(values.map(({ id }) => id)).size === values.length;
}

export function isPersistedState(value: unknown): value is PersistedStateV1 {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schemaVersion",
      "recipes",
      "shoppingItems",
      "preferences",
    ]) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.recipes) ||
    !value.recipes.every(isRecipe) ||
    !hasUniqueIds(value.recipes) ||
    !Array.isArray(value.shoppingItems) ||
    !value.shoppingItems.every(isShoppingItem) ||
    !hasUniqueIds(value.shoppingItems) ||
    !isPreferences(value.preferences)
  ) {
    return false;
  }
  const selected = value.preferences.selectedRecipeId;
  return selected === ""
    ? value.recipes.length === 0
    : value.recipes.some((recipe) => recipe.id === selected);
}

export function readExport(value: unknown): PersistedStateV1 | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schemaVersion",
      "exportedAt",
      "recipes",
      "shoppingItems",
      "preferences",
    ]) ||
    !isIsoDate(value.exportedAt)
  ) {
    return null;
  }
  const state: unknown = {
    schemaVersion: value.schemaVersion,
    recipes: value.recipes,
    shoppingItems: value.shoppingItems,
    preferences: value.preferences,
  };
  return isPersistedState(state) ? state : null;
}

export function localizeIngredient(
  ingredient: LocalizedIngredientLine,
  locale: Locale,
): IngredientLine {
  if (ingredient.kind === "unparsed") {
    return { kind: "unparsed", original: ingredient.original[locale] };
  }
  return {
    kind: "parsed",
    original: ingredient.original[locale],
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    name: ingredient.name[locale],
  };
}
