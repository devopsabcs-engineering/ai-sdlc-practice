import type {
  LibraryRecipe,
  LocalizedIngredientLine,
  LocalizedText,
} from "../domain/library.ts";
import type { SupportedUnit } from "../domain/ingredient.ts";

const SAMPLE_DATE = "2026-01-01T00:00:00.000Z";

const text = (en: string, fr: string): LocalizedText => ({ en, fr });
const ingredient = (
  quantity: number,
  unit: SupportedUnit | null,
  enOriginal: string,
  enName: string,
  frOriginal: string,
  frName: string,
): LocalizedIngredientLine => ({
  kind: "parsed",
  quantity,
  unit,
  original: text(enOriginal, frOriginal),
  name: text(enName, frName),
});

export const sampleRecipes: readonly LibraryRecipe[] = [
  {
    id: "sample-weeknight-crepes",
    title: text("Weeknight crêpes", "Crêpes de semaine"),
    baseServings: 4,
    ingredients: [
      ingredient(250, "g", "250 g flour", "flour", "250 g farine", "farine"),
      ingredient(500, "ml", "500 ml milk", "milk", "500 ml lait", "lait"),
      ingredient(2, null, "2 eggs", "eggs", "2 œufs", "œufs"),
    ],
    steps: [
      text(
        "Whisk everything into a smooth batter.",
        "Fouetter jusqu’à obtenir une pâte lisse.",
      ),
      text(
        "Cook thin crêpes in a hot pan.",
        "Cuire de fines crêpes dans une poêle chaude.",
      ),
    ],
    source: "sample",
    updatedAt: SAMPLE_DATE,
  },
  {
    id: "sample-tomato-soup",
    title: text("Quick tomato soup", "Soupe tomate express"),
    baseServings: 4,
    ingredients: [
      ingredient(
        800,
        "g",
        "800 g tomatoes",
        "tomatoes",
        "800 g tomates",
        "tomates",
      ),
      ingredient(
        500,
        "ml",
        "500 ml stock",
        "stock",
        "500 ml bouillon",
        "bouillon",
      ),
      ingredient(
        1,
        "tbsp",
        "1 tbsp olive oil",
        "olive oil",
        "1 c. à soupe huile d’olive",
        "huile d’olive",
      ),
    ],
    steps: [
      text(
        "Simmer the ingredients for 20 minutes.",
        "Mijoter les ingrédients pendant 20 minutes.",
      ),
      text("Blend until smooth.", "Mixer jusqu’à consistance lisse."),
    ],
    source: "sample",
    updatedAt: SAMPLE_DATE,
  },
  {
    id: "sample-apple-crumble",
    title: text("Apple crumble", "Croustade aux pommes"),
    baseServings: 6,
    ingredients: [
      ingredient(6, null, "6 apples", "apples", "6 pommes", "pommes"),
      ingredient(150, "g", "150 g flour", "flour", "150 g farine", "farine"),
      ingredient(100, "g", "100 g butter", "butter", "100 g beurre", "beurre"),
    ],
    steps: [
      text(
        "Slice the apples into a baking dish.",
        "Trancher les pommes dans un plat de cuisson.",
      ),
      text(
        "Rub the flour and butter together, then bake until golden.",
        "Sabler la farine et le beurre, puis cuire jusqu’à ce que le dessus soit doré.",
      ),
    ],
    source: "sample",
    updatedAt: SAMPLE_DATE,
  },
];
