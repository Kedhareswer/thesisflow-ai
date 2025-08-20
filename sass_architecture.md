# SASS Architecture for AI Project Planner

This project primarily uses Tailwind CSS with a global stylesheet at `styles/globals.css`. If you want to add SASS (SCSS) for structured styles, component theming, or complex UI pieces, use the following architecture. It complements Tailwind rather than replacing it.

Note: Next.js supports Sass out of the box. Install if needed:

```bash
pnpm add -D sass
# or
npm i -D sass
```

## Goals
- Keep Tailwind for utilities, spacing, layout, and tokens
- Use SCSS for structured components, themes, and advanced selectors
- Keep styles colocated with features where it helps, but centralize shared layers

## Directory Structure

Place SCSS under `styles/` and opt into CSS Modules for component-level styles.

```
styles/
  abstracts/          # Design tokens & helpers (no CSS output)
    _variables.scss   # Colors, spacing, shadows… (synced with Tailwind via CSS vars)
    _mixins.scss      # Reusable mixins
    _functions.scss   # Sass functions (e.g., color manipulation)

  base/               # Global resets and base tags
    _reset.scss       # Normalize/reset (or rely on Tailwind preflight)
    _typography.scss  # Base typography and prose overrides
    _globals.scss     # Global body/html rules, CSS variables

  layout/             # Layout primitives
    _container.scss
    _grid.scss
    _header.scss
    _footer.scss

  components/         # Reusable UI parts (non-Module if shared globally)
    _button.scss
    _card.scss

  pages/              # Page-level overrides (scoped by page root class)
    _dashboard.scss

  themes/             # Theming via CSS variables and data attributes
    _light.scss
    _dark.scss

  utilities/          # Helpers that generate classes
    _helpers.scss     # e.g., visually-hidden, clearfix

  vendors/            # 3rd-party overrides (rare)
    _react-datepicker.scss

  globals.scss        # Single entry to import everything (compiled once)
```

Component-scoped styles (preferred for local styles):

```
app/
  feature-x/
    Component.tsx
    Component.module.scss  # CSS Module for the component
```

## Import Order (globals.scss)
Follow the Sass 7-1 pattern (adapted):

```scss
// styles/globals.scss
@use "./abstracts/variables" as *;
@use "./abstracts/functions" as *;
@use "./abstracts/mixins" as *;

@use "./base/globals";
@use "./base/typography";

@use "./themes/light";
@use "./themes/dark";

@use "./layout/container";
@use "./layout/grid";
@use "./layout/header";
@use "./layout/footer";

@use "./components/button";
@use "./components/card";

@use "./utilities/helpers";
```

Then include `globals.scss` once (e.g., in `app/layout.tsx`):

```tsx
// app/layout.tsx
import "../styles/globals.scss";
```

If you keep Tailwind in `styles/globals.css`, convert it to SCSS and keep the `@tailwind` directives at the top:

```scss
/* styles/globals.scss */
@tailwind base;
@tailwind components;
@tailwind utilities;

@use "./abstracts/variables" as *;
@use "./base/globals";
// ...
```

## Design Tokens and Tailwind Sync
Expose Tailwind tokens as CSS variables so SCSS and Tailwind share a single source of truth.

```scss
/* styles/abstracts/_variables.scss */
:root {
  --color-primary: theme("colors.indigo.600"); // with twin.macro or postcss plugin; or hardcode
  --radius-md: 0.375rem;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06);
}

$radius-md: var(--radius-md);
$shadow-card: var(--shadow-card);
```

Alternatively, hardcode variables and keep Tailwind config in sync during reviews.

In `tailwind.config.ts`, you can point to CSS variables in your theme if desired.

## Conventions
- Use BEM for non-Module global components: `.card`, `.card__header`, `.card--elevated`
- Prefer CSS Modules for local component styles to avoid global leakage
- Keep responsive behavior in Tailwind (e.g., `md:`, `lg:`) and use SCSS for complex child selectors
- Use `data-theme="dark"` or class-based theming and set variables in `themes/_dark.scss`

## Example Component Module

```scss
/* app/feature-x/Component.module.scss */
.root {
  /* Use Tailwind classes in JSX for common styling; SCSS handles specifics */
}

.title {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
```

```tsx
// app/feature-x/Component.tsx
import styles from "./Component.module.scss";

export function Component() {
  return (
    <div className={`${styles.root} rounded-md p-4 bg-white shadow`}>
      <h3 className={`${styles.title} text-lg`}>Title</h3>
      <div className={styles.actions}>
        {/* buttons */}
      </div>
    </div>
  );
}
```

## Theming via CSS Variables

```scss
/* styles/themes/_light.scss */
:root {
  --bg: #ffffff;
  --fg: #0f172a;
}

/* styles/themes/_dark.scss */
:root[data-theme="dark"] {
  --bg: #0b1220;
  --fg: #e2e8f0;
}

/* styles/base/_globals.scss */
body {
  background: var(--bg);
  color: var(--fg);
}
```

Toggle theme using `document.documentElement.dataset.theme = 'dark'` (or via your existing theme system).

## How It Coexists With Tailwind
- Keep `@tailwind base/components/utilities` at the top of `globals.scss`
- Use Tailwind for spacing, layout, responsive, and state variants
- Use SCSS for component skinning, complex states, animations, and theme variables

## Linting & Quality
- Keep `stylelint` optional; Tailwind already enforces lots of constraints
- Consider `stylelint-config-standard-scss` if you want stricter SCSS rules

## Migration Tips
- Start by creating `styles/globals.scss` and importing it in `app/layout.tsx`
- Gradually move shared CSS from `styles/globals.css` into the SCSS structure
- Add Modules only when a component needs targeted styles not expressible in Tailwind

---

This structure keeps Tailwind as the utility backbone while giving you SCSS where it shines: structured components, theming, and advanced styling without scattering globals.
