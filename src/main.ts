import "./styles/main.css";
import { RecipeController } from "./app/recipe-controller.ts";
import {
  recipeToDraft,
  scaleQuantity,
  type RecipeDraft,
  type RecipeErrors,
} from "./domain/recipe.ts";
import type { SupportedUnit } from "./domain/ingredient.ts";
import { convertToUnitSystem } from "./domain/unit-conversion.ts";
import { createTranslator } from "./i18n/messages.ts";
import { formatQuantity } from "./ui/format-quantity.ts";

const controller = new RecipeController();
const t = createTranslator(controller.locale);
const root = document.querySelector<HTMLElement>("#main");
if (!root) throw new Error("Application root not found.");

document.documentElement.lang = controller.locale;
document.title = "Pinch — " + t("app.tagline");
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", t("app.description"));
const tagline = document.querySelector<HTMLElement>(".tagline");
if (tagline) tagline.textContent = t("app.tagline");

root.innerHTML = `
  <section class="intro" aria-labelledby="page-title">
    <div>
      <p class="eyebrow">${t("intro.eyebrow")}</p>
      <h1 id="page-title">${t("intro.title")}</h1>
      <p class="lede">${t("intro.lede")}</p>
    </div>
    <p class="privacy-note"><strong>${t("intro.privacyTitle")}</strong><br>${t("intro.privacyBody")}</p>
  </section>
  <section class="panel library" aria-labelledby="library-title">
    <div class="library-heading">
      <div><p class="eyebrow">${t("library.eyebrow")}</p><h2 id="library-title">${t("library.title")}</h2></div>
      <button id="new-recipe" class="secondary" type="button">${t("library.new")}</button>
    </div>
    <div id="recipe-list" class="recipe-list"></div>
    <div class="data-tools">
      <button id="export-data" class="text-button" type="button">${t("library.export")}</button>
      <button id="choose-import" class="text-button" type="button">${t("library.import")}</button>
      <input id="import-data" class="sr-only" type="file" accept="application/json,.json" tabindex="-1">
      <button id="clear-data" class="text-button danger" type="button">${t("library.clear")}</button>
    </div>
  </section>
  <div class="workbench">
    <section class="panel editor" aria-labelledby="editor-title">
      <div class="panel-heading">
        <div><p class="eyebrow">${t("editor.eyebrow")}</p><h2 id="editor-title">${t("editor.title")}</h2></div>
        <span class="required-note">${t("editor.required")}</span>
      </div>
      <form id="recipe-form" novalidate>
        <div class="field">
          <label for="title">${t("editor.recipeTitle")}</label>
          <input id="title" name="title" autocomplete="off" aria-describedby="title-error">
          <p class="error" id="title-error"></p>
        </div>
        <div class="field short-field">
          <label for="base-servings">${t("editor.baseServings")}</label>
          <input id="base-servings" name="baseServings" type="number" inputmode="numeric" min="1" step="1" aria-describedby="baseServings-hint baseServings-error">
          <p class="hint" id="baseServings-hint">${t("editor.baseHint")}</p>
          <p class="error" id="baseServings-error"></p>
        </div>
        <div class="field">
          <label for="ingredients">${t("editor.ingredients")}</label>
          <textarea id="ingredients" name="ingredients" rows="7" spellcheck="true" aria-describedby="ingredients-hint ingredients-error" placeholder="${t("editor.ingredientsPlaceholder")}"></textarea>
          <p class="hint" id="ingredients-hint">${t("editor.ingredientsHint")}</p>
          <p class="error" id="ingredients-error"></p>
        </div>
        <div class="field">
          <label for="steps">${t("editor.method")}</label>
          <textarea id="steps" name="steps" rows="5" spellcheck="true" aria-describedby="steps-hint steps-error" placeholder="${t("editor.methodPlaceholder")}"></textarea>
          <p class="hint" id="steps-hint">${t("editor.methodHint")}</p>
          <p class="error" id="steps-error"></p>
        </div>
        <button class="primary" type="submit">${t("editor.save")}</button>
      </form>
    </section>
    <section class="panel preview" aria-labelledby="preview-title">
      <div id="empty-preview" class="empty-state">
        <span class="empty-mark" aria-hidden="true">½</span>
        <h2 id="preview-title">${t("preview.emptyTitle")}</h2>
        <p>${t("preview.emptyBody")}</p>
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
const recipeList = document.querySelector<HTMLElement>("#recipe-list")!;

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function formatAmount(quantity: number, unit: SupportedUnit | null): string {
  const unitLabel = unit === "fl oz" ? "US fl oz" : unit;
  return `${formatQuantity(quantity, unit)}${unitLabel ? ` ${unitLabel}` : ""}`;
}

function servingWord(count: number): string {
  return t(count === 1 ? "preview.serving" : "preview.servings");
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

function writeDraft(draft?: RecipeDraft): void {
  const values = draft ?? {
    title: "",
    baseServings: "",
    ingredients: "",
    steps: "",
  };
  for (const [name, value] of Object.entries(values)) {
    const control = form.elements.namedItem(name);
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    ) {
      control.value = value;
    }
  }
  showErrors({});
}

function showErrors(errors: RecipeErrors): void {
  const fields: (keyof RecipeDraft)[] = [
    "title",
    "baseServings",
    "ingredients",
    "steps",
  ];
  for (const field of fields) {
    const input = form.elements.namedItem(field);
    const error = document.querySelector<HTMLElement>(`#${field}-error`)!;
    error.textContent = errors[field] ? t(`error.${field}`) : "";
    if (input instanceof HTMLElement) {
      input.setAttribute("aria-invalid", String(Boolean(errors[field])));
    }
  }
  const firstInvalid = fields.find((field) => errors[field]);
  const input = firstInvalid ? form.elements.namedItem(firstInvalid) : null;
  if (input instanceof HTMLElement) input.focus();
}

function renderLibrary(): void {
  if (controller.recipes.length === 0) {
    recipeList.innerHTML = `<p class="library-empty">${t("library.empty")}</p>`;
    return;
  }
  recipeList.innerHTML = controller.recipes
    .map((recipe) => {
      const title = recipe.title[controller.locale];
      const selected = recipe.id === controller.selectedRecipeId;
      return `
        <article class="library-item${selected ? " selected" : ""}">
          <button class="recipe-open" type="button" data-open="${escapeHtml(recipe.id)}" aria-label="${escapeHtml(t("library.open", { title }))}" ${selected ? 'aria-current="true"' : ""}>
            <strong>${escapeHtml(title)}</strong>
            <span>${recipe.baseServings} ${servingWord(recipe.baseServings)}</span>
          </button>
          <button class="recipe-delete" type="button" data-delete="${escapeHtml(recipe.id)}" aria-label="${escapeHtml(t("library.deleteLabel", { title }))}">${t("library.delete")}</button>
        </article>`;
    })
    .join("");
}

function showEmptyPreview(): void {
  emptyPreview.hidden = false;
  preview.hidden = true;
  preview.innerHTML = "";
}

function renderRecipe(announce = false): void {
  const recipe = controller.savedRecipe;
  if (!recipe) {
    showEmptyPreview();
    return;
  }
  const target = controller.targetServings;
  const ingredientItems = recipe.ingredients
    .map((line, index) => {
      if (line.kind === "unparsed") {
        return `<li class="ingredient unparsed"><span class="amount">—</span><span><span class="ingredient-name">${escapeHtml(line.original)}</span><small>${t("preview.unparsed")}</small></span></li>`;
      }
      const scaled = scaleQuantity(line.quantity, recipe.baseServings, target);
      const displayed = convertToUnitSystem(
        scaled,
        line.unit,
        controller.unitSystem,
      );
      return `<li class="ingredient" data-ingredient-index="${index}"><span class="amount">${formatAmount(displayed.quantity, displayed.unit)}</span><span class="ingredient-name">${escapeHtml(line.name)}</span></li>`;
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
      <div><p class="eyebrow">${t("preview.savedEyebrow")}</p><h2 id="preview-title">${escapeHtml(recipe.title)}</h2></div>
      <span class="saved-badge">${t("preview.saved")}</span>
    </div>
    <fieldset class="unit-switcher">
      <legend>${t("preview.measurement")}</legend>
      <label><input type="radio" name="unit-system" value="metric" ${controller.unitSystem === "metric" ? "checked" : ""}> ${t("preview.metric")}</label>
      <label><input type="radio" name="unit-system" value="imperial" ${controller.unitSystem === "imperial" ? "checked" : ""}> ${t("preview.imperial")}</label>
    </fieldset>
    <div class="serving-dial">
      <label for="target-servings">${t("preview.scale")}</label>
      <div class="dial-controls">
        <button id="decrease" type="button" aria-label="${t("preview.decrease")}" ${target <= 1 ? "disabled" : ""}>−</button>
        <div class="serving-count">
          <input id="target-servings" type="number" min="1" max="99" step="1" value="${target}" aria-describedby="serving-label">
          <span id="serving-label">${servingWord(target)}</span>
        </div>
        <button id="increase" type="button" aria-label="${t("preview.increase")}" ${target >= 99 ? "disabled" : ""}>+</button>
      </div>
      <span class="base-note">${t("preview.base", { count: recipe.baseServings, servings: servingWord(recipe.baseServings) })}</span>
    </div>
    <div class="recipe-content">
      <section aria-labelledby="ingredients-title">
        <h3 id="ingredients-title">${t("preview.ingredients")}</h3>
        <ul class="ingredients">${ingredientItems}</ul>
      </section>
      <section aria-labelledby="method-title">
        <h3 id="method-title">${t("preview.method")}</h3>
        <ol class="steps">${steps}</ol>
      </section>
    </div>`;
  emptyPreview.hidden = true;
  preview.hidden = false;

  const changeTarget = (next: number, shouldAnnounce = true) => {
    if (!Number.isInteger(next) || next < 1 || next > 99) {
      preview
        .querySelector<HTMLInputElement>("#target-servings")
        ?.setAttribute("aria-invalid", "true");
      status.textContent = t("status.servingsError");
      return;
    }
    controller.setTargetServings(next);
    updateScaledPreview(shouldAnnounce);
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
        status.textContent = t("status.units", {
          system:
            controller.unitSystem === "metric"
              ? t("preview.metric").toLocaleLowerCase(controller.locale)
              : t("preview.imperial").toLocaleLowerCase(controller.locale),
        });
      });
    });
  if (announce) {
    status.textContent = t("status.scaled", {
      count: target,
      servings: servingWord(target),
    });
  }
}

function updateScaledPreview(announce: boolean): void {
  const recipe = controller.savedRecipe;
  if (!recipe) return;
  const target = controller.targetServings;
  const input = preview.querySelector<HTMLInputElement>("#target-servings");
  if (input) {
    input.value = String(target);
    input.setAttribute("aria-invalid", "false");
  }
  const label = preview.querySelector<HTMLElement>("#serving-label");
  if (label) label.textContent = servingWord(target);
  const decrease = preview.querySelector<HTMLButtonElement>("#decrease");
  const increase = preview.querySelector<HTMLButtonElement>("#increase");
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
    status.textContent = t("status.scaled", {
      count: target,
      servings: servingWord(target),
    });
  }
}

function renderSelection(): void {
  renderLibrary();
  const recipe = controller.savedRecipe;
  writeDraft(recipe ? recipeToDraft(recipe) : undefined);
  renderRecipe();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = controller.save(readDraft());
  if (!result.ok) {
    showErrors(result.errors);
    status.textContent = t("error.notSaved");
    return;
  }
  showErrors({});
  renderLibrary();
  renderRecipe();
  status.textContent = t("status.saved", { title: result.recipe.title });
});

recipeList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button",
  );
  if (!button) return;
  const openId = button.dataset.open;
  if (openId && controller.open(openId)) {
    renderSelection();
    document.querySelector<HTMLInputElement>("#title")?.focus();
    return;
  }
  const deleteId = button.dataset.delete;
  const recipe = controller.recipes.find(({ id }) => id === deleteId);
  if (!recipe) return;
  const title = recipe.title[controller.locale];
  if (!window.confirm(t("library.deleteConfirm", { title }))) return;
  controller.delete(recipe.id);
  renderSelection();
  status.textContent = t("library.deleted", { title });
});

document.querySelector("#new-recipe")?.addEventListener("click", () => {
  controller.beginCreate();
  renderSelection();
  document.querySelector<HTMLInputElement>("#title")?.focus();
  status.textContent = t("library.created");
});

document.querySelector("#export-data")?.addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([controller.exportJson()], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pinch-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  status.textContent = t("library.exported");
});

document.querySelector("#choose-import")?.addEventListener("click", () => {
  document.querySelector<HTMLInputElement>("#import-data")?.click();
});

document
  .querySelector<HTMLInputElement>("#import-data")
  ?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const imported = controller.importJson(await file.text());
    if (!imported) {
      status.textContent = t("library.importError");
      return;
    }
    renderSelection();
    status.textContent = t("library.imported");
  });

document.querySelector("#clear-data")?.addEventListener("click", () => {
  if (!window.confirm(t("library.clearConfirm"))) return;
  controller.clearAll();
  renderSelection();
  status.textContent = t("library.cleared");
});

renderSelection();
if (controller.recoveredOnLoad) status.textContent = t("library.recovered");
