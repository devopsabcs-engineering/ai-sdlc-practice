# Pinch v1 Product Requirements

## 1. Product summary

Pinch is a private, offline-first recipe scaler for English- and French-speaking home cooks. A
user can enter a recipe once, scale it for a different number of servings, switch measurement
systems, shop from a persistent checklist, and follow large step-by-step cooking instructions.
The v1 product is a static installable web app with no account, server, analytics, advertising,
or runtime network dependency.

## 2. Goals

1. Make resizing a recipe faster and less error-prone than mental arithmetic.
2. Keep the experience usable while shopping or actively cooking.
3. Provide complete English and French experiences with equivalent functionality.
4. Work on a phone or desktop, online or offline, without collecting user data.
5. Keep the implementation small enough to teach and maintain as a framework-free TypeScript app.

## 3. Non-goals

1. Accounts, cloud synchronization, or sharing.
2. Importing recipes from URLs or extracting data from web pages.
3. Nutrition calculations, meal planning, photos, or social features.
4. Server-side persistence, telemetry, advertising, or third-party runtime calls.
5. Converting an unknown ingredient unit or inferring density-specific mass/volume conversions.

## 4. Users and primary journeys

- **Home cook:** enter or select a recipe, choose servings, and read recalculated amounts.
- **Unit-preferring cook:** switch supported quantities between metric and imperial.
- **Shopper:** combine ingredients from one or more scaled recipes into a persistent checklist.
- **Active cook:** keep the screen awake when supported and read one large step at a time.
- **English or French user:** use every control and sample recipe in the selected language.

## 5. Requirements and acceptance criteria

### R1. Recipe entry and preservation

The user can create and edit a recipe with a title, base serving count, ingredient lines, and
ordered steps. Ingredient input accepts one line per ingredient.

1. **AC1.1:** A recipe with a non-empty title, an integer base serving count of at least 1, one
   ingredient line, and one step can be saved.
2. **AC1.2:** Missing or invalid required values produce localized, field-associated validation
   messages and do not overwrite the last valid saved recipe.
3. **AC1.3:** Editing and saving a recipe preserves ingredient and step order.
4. **AC1.4:** An ingredient line that cannot be parsed is preserved verbatim and remains visible.

### R2. Quantity parsing and display

Pinch parses leading integer, decimal, simple-fraction, and mixed-number quantities, followed by
an optional recognized unit and an ingredient name.

1. **AC2.1:** The parser recognizes representative values `2`, `0.5`, `1/2`, and `1 1/2`.
2. **AC2.2:** A zero denominator, missing ingredient name, or otherwise invalid quantity makes the
   whole line unparsed rather than silently changing it.
3. **AC2.3:** Parsed quantities retain the original line for round-trip editing.
4. **AC2.4:** Display prefers familiar fractions for common values and locale-aware decimals for
   other values without changing the stored amount.

### R3. Serving scaling

The user can select a target serving count and immediately see parsed quantities multiplied by
`target servings / base servings`.

1. **AC3.1:** Target servings are constrained to integers from 1 through 99.
2. **AC3.2:** Every parsed quantity updates immediately when target servings change.
3. **AC3.3:** Unparsed ingredient lines remain unchanged and are identified as not scalable.
4. **AC3.4:** Gram and millilitre results are rounded to practical precision while small
   household-unit results use friendly fractions where natural.
5. **AC3.5:** Serving changes are announced through a polite live region.

### R4. Metric and imperial conversion

The user can switch supported mass and volume units between metric and imperial using documented,
deterministic factors.

1. **AC4.1:** Supported mass units convert among grams, kilograms, ounces, and pounds through a
   canonical gram value.
2. **AC4.2:** Supported volume units convert among millilitres, litres, teaspoons, tablespoons,
   cups, and US fluid ounces through a canonical millilitre value.
3. **AC4.3:** Conversion never crosses mass and volume dimensions and performs no density-based
   inference.
4. **AC4.4:** Unknown, count-based, and unconvertible units remain unchanged.
5. **AC4.5:** Unit-system changes update visible amounts and are announced without mutating the
   recipe's source quantity or unit.

### R5. Local recipe library

The user can open, create, update, and delete recipes stored on the current device. The first run
includes three bilingual sample recipes.

1. **AC5.1:** Saved recipes and the selected recipe survive a browser restart.
2. **AC5.2:** The first run seeds exactly three sample recipes with English and French titles,
   ingredients, and steps.
3. **AC5.3:** Deleting a recipe requires confirmation and cannot leave an invalid selected-recipe
   reference.
4. **AC5.4:** User-created identifiers do not collide with sample or existing recipe identifiers.

### R6. Shopping list

The user can add the currently scaled ingredients to a persistent shopping checklist, check items
off, and clear checked items.

1. **AC6.1:** Adding a recipe contributes its currently displayed scaled quantities.
2. **AC6.2:** Parsed items with the same normalized ingredient name and compatible canonical unit
   are merged by summing quantities.
3. **AC6.3:** Items with incompatible or unknown units remain separate so no invalid arithmetic
   occurs.
4. **AC6.4:** Checked state and unchecked items survive a browser restart.
5. **AC6.5:** Clearing checked items removes only checked items and exposes a localized empty state
   when no items remain.

### R7. Cook mode

The user can follow one recipe step at a time in a focused, full-screen experience.

1. **AC7.1:** Cook mode starts at the first step and exposes the current position and total count.
2. **AC7.2:** Previous and next work by buttons, Left/Right arrow keys, and horizontal swipe.
3. **AC7.3:** The last next action becomes Finish, and Close or Escape exits cook mode.
4. **AC7.4:** Opening cook mode requests a screen wake lock when supported and releases it on exit
   or document invisibility.
5. **AC7.5:** Unsupported or rejected wake lock produces a localized non-blocking message while
   all navigation remains usable.
6. **AC7.6:** Focus is trapped while open and restored to the opener when cook mode closes.

### R8. Complete English and French localization

The user can switch the entire interface between English and French, and the selection persists.

1. **AC8.1:** Every visible UI message, validation error, status announcement, and sample-recipe
   field resolves from the selected locale.
2. **AC8.2:** Switching locale updates the document `lang` attribute and number formatting
   immediately; French uses decimal commas.
3. **AC8.3:** The locale survives a browser restart.
4. **AC8.4:** The `i18n-parity` gate fails when catalog keys differ or a catalog value is empty.

### R9. Local data control and privacy

All user data remains on the device. The user can export, import, and clear it.

1. **AC9.1:** Runtime behavior makes no third-party network request and contains no analytics or
   account identifier.
2. **AC9.2:** Export downloads a versioned JSON document containing recipes, shopping items, and
   preferences.
3. **AC9.3:** Import validates version and shape before one atomic replacement; invalid input
   leaves existing data unchanged and shows a localized error.
4. **AC9.4:** Clear all data requires confirmation, removes user data, restores the samples and
   defaults, and does not remove the application itself.

### R10. Offline installation

Pinch is an installable progressive web app whose complete product behavior works offline after a
successful initial load.

1. **AC10.1:** The production build includes a valid web app manifest, icons, start URL, display
   mode, name, short name, and theme/background colors.
2. **AC10.2:** A service worker precaches the production application shell and updates without
   mixing incompatible asset revisions.
3. **AC10.3:** Reloading any supported app route offline renders the app and all local features
   remain usable.
4. **AC10.4:** A throttled production smoke run scores at least 0.90 for performance and reports
   the app as installable.

### R11. Responsive, themed, accessible interaction

The product implements the approved Enamel & Blueberry workbench, light and dark themes, and
keyboard-operable responsive behavior.

1. **AC11.1:** The app has no horizontal page scroll at 360 CSS pixels and uses the approved
   two-column workbench at 900 CSS pixels and wider.
2. **AC11.2:** Theme follows the system on first use, can be explicitly switched, and persists.
3. **AC11.3:** Both themes meet WCAG 2.1 AA text/control contrast, expose visible focus, use
   semantic names and landmarks, and provide targets at least 44 by 44 CSS pixels.
4. **AC11.4:** All flows are keyboard operable and nonessential motion is disabled when
   `prefers-reduced-motion` is set.
5. **AC11.5:** Automated end-to-end checks cover scale, convert, shopping, cook mode, language,
   theme, and 360-pixel behavior with no console errors.

### R12. Portable, releasable static delivery

The repository builds and verifies Pinch consistently on Windows and Linux and can publish the
approved static artifact to the repository's GitHub Pages site.

1. **AC12.1:** Vite uses `/ai-sdlc-practice/` as its production base and emits a static `dist/`.
2. **AC12.2:** Build, lint, format, unit, end-to-end, catalog parity, and audit commands avoid
   shell-specific syntax and hard-coded absolute paths.
3. **AC12.3:** The `portable-os` gate runs the documented verification commands on both Windows
   and Linux and fails when either job fails.
4. **AC12.4:** High- and critical-severity production dependency audit findings fail the security
   gate.
5. **AC12.5:** Deployment is manual, requires a `governance_approved` input, and targets
   `https://devopsabcs-engineering.github.io/ai-sdlc-practice/`.

## 6. Success measures

1. All R1-R12 acceptance criteria pass in the production build.
2. A user can scale the seeded crepe recipe, convert units, add it to shopping, and finish cook
   mode in either locale without a network connection.
3. Catalog parity and Windows/Linux portability remain blocking project gates.
4. The production bundle makes no runtime request except same-origin service-worker-controlled
   asset requests.

## 7. Dependencies and risks

- Screen Wake Lock availability varies; the experience must degrade without blocking cooking.
- Local storage can be cleared by the browser; export is the only v1 backup mechanism.
- Volume-to-mass conversion depends on ingredient density and is intentionally excluded.
- Service-worker updates can strand stale assets if revisioning is incorrect; generated precache
  revisions and a single update strategy are required.
- French ingredient names cannot be safely inferred from English; bundled samples store both.

## 8. Requirement-to-build traceability

| Requirements | Build task |
|---|---|
| R1, R2, R3 | T-004 |
| R4 | T-005 |
| R5, R9 | T-006 |
| R6 | T-007 |
| R7 | T-008 |
| R8, R11 | T-009 |
| R10, R12 | T-010 |
