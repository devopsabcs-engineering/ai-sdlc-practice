import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.afterEach(async ({ context }) => {
  await context.setOffline(false);
});

test("scales a recipe and converts supported measurements", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open Weeknight crêpes" }).click();

  const flourAmount = page
    .locator('[data-ingredient-index="0"]')
    .locator(".amount");
  await page.locator("#target-servings").fill("8");
  await expect(flourAmount).toHaveText("500 g");

  await page.getByRole("radio", { name: "Imperial" }).check();
  await expect(flourAmount).not.toHaveText("500 g");
});

test("adds, checks, and clears shopping items", async ({ page }) => {
  await page.getByRole("button", { name: "Open Weeknight crêpes" }).click();
  await page.getByRole("button", { name: "Add displayed ingredients" }).click();

  const flour = page.getByRole("checkbox", { name: /flour/i });
  await expect(flour).toBeVisible();
  await flour.check();
  await page.getByRole("button", { name: "Clear checked" }).click();
  await expect(flour).toHaveCount(0);
});

test("navigates cook mode with the keyboard", async ({ page }) => {
  await page.getByRole("button", { name: "Open Weeknight crêpes" }).click();
  await page.getByRole("button", { name: "Start cook mode" }).click();

  const dialog = page.getByRole("dialog", { name: "Weeknight crêpes" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#cook-progress")).toHaveText("Step 1 of 2");
  await dialog.press("ArrowRight");
  await expect(page.locator("#cook-progress")).toHaveText("Step 2 of 2");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(dialog).not.toBeVisible();
});

test("switches the complete interface to French", async ({ page }) => {
  await page.getByRole("button", { name: "FR" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("#library-title")).toHaveText(
    "Bibliothèque de recettes",
  );
  await expect(
    page.getByRole("button", { name: "Ouvrir Crêpes de semaine" }),
  ).toBeVisible();
});

test("reloads the production application while offline", async ({
  context,
  page,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();

  await expect(page.locator("#page-title")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recipe library" }),
  ).toBeVisible();
});

test("passes accessibility and phone-width smoke checks", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
