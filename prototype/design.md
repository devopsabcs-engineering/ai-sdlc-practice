# Pinch prototype design

## Product intent

Pinch helps a home cook resize a recipe without interrupting the work of cooking. The prototype
must prove that scaling, unit switching, shopping, language switching, and cook mode can live in
one calm, legible experience on a phone or desktop.

## Assumptions

- The prototype is a throwaway UX artifact, not the Vite production application.
- The sample recipe is the bilingual **Weeknight crepes / Crepes de semaine**.
- Changes are held only in page memory. Persistence, parsing, conversion accuracy, wake lock,
  PWA behavior, and import/export belong to later production work.
- The initial viewport uses the browser's preferred color scheme, while an explicit theme choice
  takes precedence for the current page session.

## Experience direction

### Approaches considered

1. **Single recipe workbench (selected):** recipe, serving control, ingredients, and steps share
   one surface. This best supports glancing and keeps the scaling result visible.
2. **Step-by-step wizard:** easier for first-time entry, but too slow for returning cooks who want
   to adjust one value.
3. **Three-column utility dashboard:** efficient on wide screens, but cramped and visually noisy
   at the 360 px minimum.

The selected direction uses a responsive workbench that becomes a single column on phones.

### Visual signature

The serving control is a **measuring-tape dial**: a ruled horizontal band with a prominent serving
count and minus/plus controls. It connects the primary interaction to a familiar kitchen measuring
tool without adding decorative clutter.

### Palette and typography

The custom theme, **Enamel & Blueberry**, borrows from enamel cookware, blue kitchen pencil, and
fresh berry ink rather than generic food-app earth tones.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--canvas` | `#F3F7F5` | `#101817` | page background |
| `--surface` | `#FFFFFF` | `#182321` | cards and controls |
| `--ink` | `#17201E` | `#F4F8F6` | primary text |
| `--muted` | `#586864` | `#AFC0BB` | secondary text |
| `--accent` | `#3157A4` | `#91B4FF` | actions and focus |
| `--citrus` | `#F2C14E` | `#E6B84B` | measured emphasis |
| `--border` | `#C8D5D1` | `#3A4B47` | boundaries |

The prototype uses a local system stack to remain offline. Georgia gives recipe titles a human,
editorial character; Segoe UI/system sans keeps controls compact and familiar; a monospace stack
is reserved for quantities and utility labels.

## Information architecture

```text
+------------------------------------------------------------------+
| Pinch | Recipe  Shopping | EN/FR | Light/Dark                    |
+------------------------------------------------------------------+
| Recipe identity                 | Servings measuring-tape dial    |
+---------------------------------+--------------------------------+
| Ingredients                     | Method                          |
| rescaled amount + item          | numbered steps                  |
| [Add to shopping list]          | [Start cook mode]               |
+---------------------------------+--------------------------------+
| Shopping drawer / panel with merged checklist                    |
+------------------------------------------------------------------+
```

At narrow widths, identity, dial, ingredients, and method stack in reading order. Navigation
remains horizontally compact and wraps rather than becoming a hidden menu.

## Critical flows and states

### Scale and convert

1. The cook opens the sample recipe at its base serving count of four.
2. Minus/plus controls change the serving count from one to twelve.
3. Ingredient quantities update immediately; a live status announces the new serving count.
4. Metric/imperial segmented controls change displayed units for convertible ingredients.
5. Unknown units remain unchanged in the future production implementation.

### Shop

1. **Add to list** adds the currently scaled ingredients.
2. The shopping panel opens and displays checkboxes with quantities.
3. A checked item becomes visually subdued.
4. **Clear checked** removes checked items; an empty state directs the user back to a recipe.

### Cook

1. **Start cook mode** opens a full-screen dialog at step one.
2. The active step is large and isolated from other recipe detail.
3. Previous/next buttons, Left/Right arrow keys, and horizontal swipe move between steps.
4. The last step changes **Next** to **Finish**; Escape or **Close** exits.
5. A restrained wake-lock support note is always available in the prototype.

### Language and theme

- EN/FR switches every visible interface string and sample-recipe content, updates
  `document.documentElement.lang`, and uses locale-aware number punctuation.
- Light/dark switches all semantic tokens. Both themes retain visible boundaries and focus.

### Empty, loading, and error direction

- The prototype has no asynchronous loading state.
- Shopping uses a directional empty state: “Your list is empty. Add ingredients from a recipe.”
- Production recipe parsing should preserve unparsed lines and explain that they will not scale.
- Production import errors should identify invalid JSON without replacing existing local data.

## Accessibility and responsive requirements

- Meet WCAG 2.1 AA text and control contrast in both themes.
- Use semantic landmarks, headings, buttons, lists, fieldsets, dialog semantics, and native
  checkboxes.
- Every interaction must work by keyboard with a clearly visible `:focus-visible` outline.
- Announce serving, unit, shopping, language, and cook-step changes through a polite live region.
- Keep targets at least 44 by 44 CSS pixels and body text at least 16 px.
- At 360 px, avoid horizontal page scrolling and preserve the ingredient amount/name distinction.
- At 900 px and above, use a two-column workbench with a maximum readable width.
- Disable nonessential transitions under `prefers-reduced-motion`.

## Acceptance-ready prototype checks

- A reviewer can scale the recipe and observe all quantities change.
- A reviewer can switch metric/imperial and see representative mass and volume conversions.
- A reviewer can add scaled ingredients, check items, and clear checked items.
- A reviewer can complete cook mode with buttons and keyboard.
- A reviewer can switch EN/FR with no visible untranslated prototype string.
- A reviewer can switch light/dark themes.
- The prototype remains usable at 360 px and desktop widths, without console errors.
- Keyboard focus, semantic dialog behavior, reduced motion, and text contrast receive an
  accessibility smoke check.
