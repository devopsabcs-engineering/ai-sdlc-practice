# Pinch v1 Architecture

## 1. Scope and constraints

Pinch is a client-only progressive web app built with Vite, strict TypeScript, semantic HTML, and
CSS variables. It has no UI framework, server, account, telemetry, or runtime third-party
dependency. Production is hosted below `/ai-sdlc-practice/` on GitHub Pages. The architecture
must preserve complete offline behavior, local privacy, catalog parity, and Windows/Linux command
portability.

The approved prototype defines interaction and visual behavior but is not production source code.

## 2. System context

```text
User
  |
  v
Pinch static PWA (browser)
  |-- UI and application controllers
  |-- pure recipe/shopping domain modules
  |-- localization catalogs
  |-- versioned localStorage repository
  `-- generated service worker and precache

Build/release boundary
  Vite + TypeScript + Vitest + Playwright
        |
        `-- manual GitHub Actions Pages deployment
```

The browser is the only runtime. Export writes a user-selected JSON download; import reads a
user-selected local JSON file. Neither path sends data over a network.

## 3. Source layout

```text
src/
  app/             composition root and application controllers
  domain/          parsing, scaling, conversion, shopping merge, schemas
  infrastructure/  local storage, import/export, wake lock, service-worker registration
  i18n/            typed EN/FR catalogs, formatter, parity support
  ui/              semantic views, event bindings, focus/dialog behavior
  styles/          approved tokens, responsive layout, themes, reduced motion
  samples/         three bilingual recipe fixtures
tests/
  unit/            Vitest domain and persistence contract tests
  e2e/             Playwright user journeys and offline/accessibility smoke
scripts/
  check-i18n.*     catalog parity gate
```

Modules depend inward: `ui` and `infrastructure` may call `app` and `domain`; domain modules never
read the DOM, storage, locale, or network. The composition root creates adapters and controllers.

## 4. Runtime components and data flow

1. **App bootstrap** loads the typed catalogs, opens the versioned repository, seeds samples when
   needed, restores preferences, and renders the selected recipe.
2. **Recipe controller** validates edits and passes ingredient lines to pure parsing, scaling, and
   conversion functions. It persists only valid recipes.
3. **Shopping controller** converts displayed scalable ingredients into canonical merge entries,
   preserves incompatible entries, and persists each mutation.
4. **Cook controller** owns step position, dialog focus, gesture/keyboard input, and a wake-lock
   adapter. Wake-lock failures become status messages, not flow failures.
5. **Locale/theme controller** updates catalogs, number formatting, `document.lang`, semantic
   tokens, and persisted preferences without reloading.
6. **PWA layer** precaches revisioned build output. Application state remains in localStorage and
   is not cached as an HTTP resource.

Rendering derives a view model from immutable stored state. UI event handlers issue controller
commands; controllers validate, produce the next state, persist it, and trigger one render.

## 5. Domain contracts

Representative contracts are normative; implementation may split files but must preserve their
semantics.

```ts
type Locale = "en" | "fr";
type UnitSystem = "metric" | "imperial";
type ThemePreference = "system" | "light" | "dark";

interface LocalizedText {
  en: string;
  fr: string;
}

interface Recipe {
  id: string;
  title: LocalizedText;
  baseServings: number;
  ingredients: IngredientLine[];
  steps: LocalizedText[];
  source: "sample" | "user";
  updatedAt: string;
}

type IngredientLine =
  | {
      kind: "parsed";
      original: LocalizedText;
      quantity: number;
      unit: SupportedUnit | null;
      name: LocalizedText;
    }
  | {
      kind: "unparsed";
      original: LocalizedText;
    };

interface ShoppingItem {
  id: string;
  name: LocalizedText;
  quantity: number | null;
  unit: SupportedUnit | null;
  canonicalDimension: "mass" | "volume" | "count" | "unknown";
  checked: boolean;
}

interface Preferences {
  locale: Locale;
  unitSystem: UnitSystem;
  theme: ThemePreference;
  selectedRecipeId: string;
}

interface PinchExportV1 {
  schemaVersion: 1;
  exportedAt: string;
  recipes: Recipe[];
  shoppingItems: ShoppingItem[];
  preferences: Preferences;
}
```

All imported data is treated as `unknown` until runtime validation succeeds. Dates are ISO 8601
UTC strings. Identifiers are generated locally with `crypto.randomUUID()` and a tested fallback
only where the API is unavailable.

## 6. Parsing, scaling, and conversion rules

Ingredient parsing is anchored at the start of a trimmed line:

1. Parse an integer, decimal using `.` as the edit syntax, simple fraction, or mixed number.
2. Reject non-finite values, values at or below zero, and zero denominators.
3. Match an optional supported unit or alias at a token boundary.
4. Require a remaining ingredient name; otherwise preserve the whole line as unparsed.
5. Keep original localized input beside normalized numeric fields for lossless editing.

Scaling uses `quantity * targetServings / baseServings` and does not mutate stored source values.
Formatting occurs only at the UI boundary. Common fractions use a bounded denominator and a
documented tolerance; otherwise `Intl.NumberFormat` applies locale punctuation and practical
precision.

Conversions use exact documented factors through grams for mass and millilitres for volume.
No mass/volume crossover occurs. The display system chooses a practical target unit by magnitude;
the original quantity and unit remain unchanged. Shopping merges normalize whitespace and case
for the ingredient key, convert compatible values to a canonical unit, sum, then select a display
unit. Unknown or incompatible units receive distinct keys.

## 7. Persistence and migration

One localStorage key, `pinch.state`, contains an envelope:

```ts
interface PersistedStateV1 {
  schemaVersion: 1;
  recipes: Recipe[];
  shoppingItems: ShoppingItem[];
  preferences: Preferences;
}
```

The repository validates the entire envelope before returning it. A missing key seeds defaults.
An unsupported or invalid stored value is copied to `pinch.state.recovery`, then defaults are
loaded with a localized recovery notice. Writes serialize the complete next state to one key so
the app does not expose partially updated cross-entity state.

Import validates into a temporary in-memory state and performs one repository write only after
all fields pass. Clear-all removes both primary and recovery keys, then performs normal first-run
seeding. Export uses the same schema plus `exportedAt`; no object URL survives after download.

localStorage is synchronous and quota-limited but appropriate for small text-only v1 data. The
repository interface isolates a future IndexedDB migration.

## 8. Localization and accessibility

English is the source catalog. Both catalogs satisfy one compile-time message-key type, while the
`i18n-parity` script independently checks equal keys and non-empty values in CI. Dynamic sample
content stores explicit English and French values; user-authored text is never machine-translated.
All number output uses `Intl.NumberFormat(locale)`.

Views use landmarks, headings, lists, native controls, field-associated errors, and a modal dialog
with focus containment/restoration. State changes use a single polite live region and avoid
duplicated announcements. CSS implements the approved semantic tokens, 44-pixel targets, a
360-pixel minimum layout, a 900-pixel two-column breakpoint, visible focus, and reduced motion.

## 9. Offline and update behavior

`vite-plugin-pwa` generates the manifest and revisioned precache from Vite output. The app uses a
single generated service-worker strategy rather than a hand-maintained asset list. New assets are
installed atomically; an already open page continues on its current revision until reload. The UI
may notify the user that an update is ready but must not force a mid-task reload.

Navigation requests under the configured base fall back to the cached app entry. No cross-origin
resource is required. Offline Playwright coverage performs an initial online load, switches the
browser context offline, reloads, and exercises representative stored features.

## 10. Build, test, and release

- **Build:** Vite builds with strict TypeScript checks and base `/ai-sdlc-practice/`.
- **Lint/format:** ESLint and Prettier run through package scripts.
- **Unit:** Vitest covers parsing, fraction formatting, scaling, conversions, merge behavior,
  storage validation, migration/recovery, import/export, and catalog parity.
- **Acceptance:** Playwright's bundled Chromium covers the required user journeys, responsive
  viewport, keyboard behavior, offline reload, and console errors.
- **Project gates:** `i18n-parity` checks catalogs; `portable-os` runs the documented commands in
  Windows and Linux CI jobs without shell-specific scripts.
- **Security:** secret scan, static analysis, high/critical production dependency audit, and a
  privacy/network review run before sign-off.
- **Release:** a manually dispatched GitHub Actions workflow requires
  `governance_approved=true`, builds the exact reviewed commit, and deploys `dist/` to Pages.

No deployment may occur before the recorded Product Owner, Security Team, and Tech Lead sign-off.

## 11. Failure behavior and observability

Pinch has no telemetry. User-action failures are reported through localized inline or status
messages. Invalid edits/imports never replace valid state. Storage quota or serialization errors
leave the last persisted state intact and clearly state that the latest change was not saved.
Unexpected errors may be logged to the browser console without recipe or shopping content.

Build and acceptance diagnostics are the operational record: test reports, Lighthouse-style
smoke output, audit results, and the immutable deployed commit SHA.

## 12. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Ambiguous ingredient grammar | Parse only the documented prefix grammar and preserve all other lines |
| Invalid cross-unit merges | Merge only matching normalized names and compatible dimensions |
| Storage corruption or schema drift | Validate envelopes, version schemas, retain one recovery copy |
| Stale PWA asset combinations | Generated revisioned precache and one update strategy |
| Incomplete translation | Typed catalogs plus blocking `i18n-parity` |
| OS-specific scripts | Node/package scripts and blocking Windows/Linux `portable-os` matrix |
| Wake lock unavailable | Adapter with non-blocking localized fallback |

## 13. Binding decisions

- [ADR-004](adr/ADR-004-vite-typescript-no-ui-framework.md)
- [ADR-005](adr/ADR-005-pure-domain-and-adapter-boundaries.md)
- [ADR-006](adr/ADR-006-versioned-localstorage-state.md)
- [ADR-007](adr/ADR-007-canonical-unit-conversion.md)
- [ADR-008](adr/ADR-008-typed-bilingual-catalogs.md)
- [ADR-009](adr/ADR-009-generated-pwa-precache.md)
- [ADR-010](adr/ADR-010-governed-github-pages-release.md)

## 14. Requirement and task traceability

| Requirements | Architecture sections | Build task |
|---|---|---|
| R1-R3 | 3-6 | T-004 |
| R4 | 5-6 | T-005 |
| R5, R9 | 4, 5, 7 | T-006 |
| R6 | 4-6 | T-007 |
| R7 | 4, 8, 11 | T-008 |
| R8, R11 | 3, 4, 8 | T-009 |
| R10, R12 | 1, 9, 10 | T-010 |
