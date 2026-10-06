import "./styles/main.css";
import { RecipeController } from "./app/recipe-controller.ts";
import {
  scaleQuantity,
  type RecipeDraft,
  type RecipeErrors,
} from "./domain/recipe.ts";
import type { SupportedUnit } from "./domain/ingredient.ts";
import { formatQuantity } from "./ui/format-quantity.ts";
import { convertToUnitSystem } from "./domain/unit-conversion.ts";

const controller = new RecipeController();
const root = document.querySelector<HTMLElement>("#main");
if (!root) throw new Error("Application root not found.");

root.innerHTML = `
  <section class="intro" aria-labelledby="page-title">
    <div>
      <p class="eyebrow">Recipe workbench</p>
      <h1 id="page-title">Make the recipe fit the table.</h1>
      <p class="lede">Write it once, then choose exactly how many people you’re feeding.</p>
    </div>
    <p class="privacy-note"><strong>Private by design</strong><br>Your recipe stays in this tab.</p>
  </section>
  <div class="workbench">
    <section class="panel editor" aria-labelledby="editor-title">
      <div class="panel-heading">
        <div><p class="eyebrow">Create or edit</p><h2 id="editor-title">Your recipe</h2></div>
        <span class="required-note">All fields required</span>
      </div>
      <form id="recipe-form" novalidate>
        <div class="field">
          <label for="title">Recipe title</label>
          <input id="title" name="title" autocomplete="off" aria-describedby="title-error">
          <p class="error" id="title-error"></p>
        </div>
        <div class="field short-field">
          <label for="base-servings">Base servings</label>
          <input id="base-servings" name="baseServings" type="number" inputmode="numeric" min="1" step="1" aria-describedby="baseServings-hint baseServings-error">
          <p class="hint" id="baseServings-hint">How many servings the quantities below make.</p>
          <p class="error" id="baseServings-error"></p>
        </div>
        <div class="field">
          <label for="ingredients">Ingredients</label>
          <textarea id="ingredients" name="ingredients" rows="7" spellcheck="true" aria-describedby="ingredients-hint ingredients-error" placeholder="250 g flour&#10;1 1/2 cups milk&#10;salt, to taste"></textarea>
          <p class="hint" id="ingredients-hint">One per line. Start with an integer, decimal, fraction, or mixed number to make it scalable.</p>
          <p class="error" id="ingredients-error"></p>
        </div>
        <div class="field">
          <label for="steps">Method</label>
          <textarea id="steps" name="steps" rows="5" spellcheck="true" aria-describedby="steps-hint steps-error" placeholder="Whisk the ingredients together.&#10;Cook until golden."></textarea>
          <p class="hint" id="steps-hint">One step per line, in cooking order.</p>
          <p class="error" id="steps-error"></p>
        </div>
        <button class="primary" type="submit">Save recipe</button>
      </form>
    </section>
    <section class="panel preview" aria-labelledby="preview-title">
      <div id="empty-preview" class="empty-state">
        <span class="empty-mark" aria-hidden="true">½</span>
        <h2 id="preview-title">Your scaled recipe appears here</h2>
        <p>Save a valid recipe to start measuring.</p>
      </div>
      <div id="recipe-preview" hidden></div>
    </section>
  </div>
  <div id="status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
`;

const form = document.querySelector<HTMLFormElement>("#recipe-form")!;
const status = document.querySelector<HTMLElement>("#status")!;
const emptyPreview = document.querySelector<HTMLElement>("#empty-preview")!;
const preview = document.querySelector<HTMLElement>("#recipe-preview")!;

function formatAmount(quantity: number, unit: SupportedUnit | null): string {
  const unitLabel = unit === "fl oz" ? "US fl oz" : unit;
  return `${formatQuantity(quantity, unit)}${unitLabel ? ` ${unitLabel}` : ""}`;
}

function readDraft(): RecipeDraft {
  const data = new FormData(form);
  return {
    title: String(data.get("title") ?? ""),
    baseServings: String(data.get("baseServings") ?? ""),
    ingredients: String(data.get("ingredients") ?? ""),
    steps: String(data.get("steps") ?? ""),
  };
}

function showErrors(errors: RecipeErrors) {
  const fields: (keyof RecipeDraft)[] = [
    "title",
    "baseServings",
    "ingredients",
    "steps",
  ];
  for (const field of fields) {
    const input = form.elements.namedItem(field);
    const error = document.querySelector<HTMLElement>(`#${field}-error`)!;
    error.textContent = errors[field] ?? "";
    if (input instanceof HTMLElement)
      input.setAttribute("aria-invalid", String(Boolean(errors[field])));
  }
  const firstInvalid = fields.find((field) => errors[field]);
  const input = firstInvalid ? form.elements.namedItem(firstInvalid) : null;
  if (input instanceof HTMLElement) input.focus();
}

function renderRecipe(announce = false) {
  const recipe = controller.savedRecipe;
  if (!recipe) return;
  const target = controller.targetServings;
  const ingredientItems = recipe.ingredients
    .map((line, index) => {
      if (line.kind === "unparsed") {
        return `<li class="ingredient unparsed"><span class="amount">—</span><span><span class="ingredient-name">${escapeHtml(line.original)}</span><small>Not scalable · kept as written</small></span></li>`;
      }
      const scaled = scaleQuantity(line.quantity, recipe.baseServings, target);
      const displayed = convertToUnitSystem(
        scaled,
        line.unit,
        controller.unitSystem,
      );
      const amount = formatAmount(displayed.quantity, displayed.unit);
      return `<li class="ingredient" data-ingredient-index="${index}"><span class="amount">${amount}</span><span class="ingredient-name">${escapeHtml(line.name)}</span></li>`;
    })
    .join("");
  const steps = recipe.steps
    .map(
      (step, index) =>
        `<li><span aria-hidden="true">${index + 1}</span><p>${escapeHtml(step)}</p></li>`,
    )
    .join("");

  preview.innerHTML = `
    <div class="preview-heading">
      <div><p class="eyebrow">Saved recipe</p><h2 id="preview-title">${escapeHtml(recipe.title)}</h2></div>
      <span class="saved-badge">Saved</span>
    </div>
    <fieldset class="unit-switcher">
      <legend>Measurement system</legend>
      <label><input type="radio" name="unit-system" value="metric" ${controller.unitSystem === "metric" ? "checked" : ""}> Metric</label>
      <label><input type="radio" name="unit-system" value="imperial" ${controller.unitSystem === "imperial" ? "checked" : ""}> Imperial</label>
    </fieldset>
    <div class="serving-dial">
      <label for="target-servings">Scale recipe</label>
      <div class="dial-controls">
        <button id="decrease" type="button" aria-label="Decrease servings" ${target <= 1 ? "disabled" : ""}>−</button>
        <div class="serving-count">
          <input id="target-servings" type="number" min="1" max="99" step="1" value="${target}" aria-describedby="serving-label">
          <span id="serving-label">${target === 1 ? "serving" : "servings"}</span>
        </div>
        <button id="increase" type="button" aria-label="Increase servings" ${target >= 99 ? "disabled" : ""}>+</button>
      </div>
      <span class="base-note">Base recipe: ${recipe.baseServings} ${recipe.baseServings === 1 ? "serving" : "servings"}</span>
    </div>
    <div class="recipe-content">
      <section aria-labelledby="ingredients-title">
        <h3 id="ingredients-title">Ingredients</h3>
        <ul class="ingredients">${ingredientItems}</ul>
      </section>
      <section aria-labelledby="method-title">
        <h3 id="method-title">Method</h3>
        <ol class="steps">${steps}</ol>
      </section>
    </div>
  `;
  emptyPreview.hidden = true;
  preview.hidden = false;

  const changeTarget = (next: number, announce = true) => {
    if (!Number.isInteger(next) || next < 1 || next > 99) {
      const input = preview.querySelector<HTMLInputElement>("#target-servings");
      input?.setAttribute("aria-invalid", "true");
      status.textContent = "Servings must be a whole number from 1 to 99.";
      return;
    }
    controller.setTargetServings(next);
    updateScaledPreview(announce);
  };
  preview
    .querySelector("#decrease")
    ?.addEventListener("click", () =>
      changeTarget(controller.targetServings - 1),
    );
  preview
    .querySelector("#increase")
    ?.addEventListener("click", () =>
      changeTarget(controller.targetServings + 1),
    );
  preview
    .querySelector("#target-servings")
    ?.addEventListener("input", (event) => {
      changeTarget(Number((event.currentTarget as HTMLInputElement).value));
    });
  preview
    .querySelectorAll<HTMLInputElement>('input[name="unit-system"]')
    .forEach((control) => {
      control.addEventListener("change", () => {
        if (!control.checked) return;
        controller.setUnitSystem(
          control.value === "imperial" ? "imperial" : "metric",
        );
        updateScaledPreview(false);
        status.textContent = `Measurements shown in ${controller.unitSystem} units.`;
      });
    });
  if (announce)
    status.textContent = `Recipe scaled to ${target} ${target === 1 ? "serving" : "servings"}.`;
}

function updateScaledPreview(announce: boolean) {
  const recipe = controller.savedRecipe;
  if (!recipe) return;

  const target = controller.targetServings;
  const input = preview.querySelector<HTMLInputElement>("#target-servings");
  const servingLabel = preview.querySelector<HTMLElement>("#serving-label");
  const decrease = preview.querySelector<HTMLButtonElement>("#decrease");
  const increase = preview.querySelector<HTMLButtonElement>("#increase");

  if (input) {
    input.value = String(target);
    input.setAttribute("aria-invalid", "false");
  }
  if (servingLabel)
    servingLabel.textContent = target === 1 ? "serving" : "servings";
  if (decrease) decrease.disabled = target <= 1;
  if (increase) increase.disabled = target >= 99;

  recipe.ingredients.forEach((line, index) => {
    if (line.kind !== "parsed") return;
    const amount = preview.querySelector<HTMLElement>(
      `[data-ingredient-index="${index}"] .amount`,
    );
    if (!amount) return;
    const scaled = scaleQuantity(line.quantity, recipe.baseServings, target);
    const displayed = convertToUnitSystem(
      scaled,
      line.unit,
      controller.unitSystem,
    );
    amount.textContent = formatAmount(displayed.quantity, displayed.unit);
  });

  if (announce) {
    status.textContent = `Recipe scaled to ${target} ${target === 1 ? "serving" : "servings"}.`;
  }
}

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = controller.save(readDraft());
  if (!result.ok) {
    showErrors(result.errors);
    status.textContent = "Recipe not saved. Check the highlighted fields.";
    return;
  }
  showErrors({});
  renderRecipe();
  status.textContent = `${result.recipe.title} saved.`;
});
