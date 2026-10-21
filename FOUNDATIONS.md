# Foundations

The rules every component follows. If a component breaks one of these, the component is wrong, not the rule.

The library is for interfaces people use all day: dashboards, admin panels, internal tools. Every decision optimises for the 200th use, not the first impression.

## 1. Motion

Motion exists to explain where something came from and that an action registered. It is never decoration.

| Rule | How it is enforced |
| --- | --- |
| **The more often something is used, the less it animates.** Menus, tooltips, tabs and the command palette are near instant. Rare moments (onboarding, empty states, success) may be expressive. | Core components only use the `motion-*` utilities. Expressive motion lives in Pro blocks. |
| **Keyboard input is never animated.** Opening the palette with Cmd+K or closing with Esc is instant. | `<InputModality />` sets `html[data-input="keyboard"]`, and every `motion-*` utility drops to 0ms under it. |
| **Durations are tokens.** `fast 120ms`, `base 160ms`, `slow 220ms`, `exit 110ms`. Nothing in the core exceeds 220ms. | `--qui-duration-*` in `quireui.css`. |
| **Exits are faster than entrances.** | Every `motion-*` utility switches to `--qui-duration-exit` on `[data-ending-style]`. |
| **Ease out, never ease in.** Ease-in makes UI feel like it hesitates. | `--qui-ease-out` is the only curve the utilities use. |
| **Only `opacity`, `scale` and `translate`.** Never width, height, top or left. | Utilities only list compositor-friendly properties. |
| **Popups grow from their trigger.** Start at 0.96 scale, never 0. | `motion-pop` uses Base UI's `--transform-origin`. |
| **Everything is interruptible.** Toggling quickly reverses smoothly. | CSS transitions only, no keyframes, using Base UI's `data-starting-style` and `data-ending-style`. |
| **Grouped tooltips are instant after the first.** | `TooltipProvider` plus Base UI's `data-instant`. |
| **Reduced motion keeps the fade.** Removing all motion makes state changes harder to follow. | Each utility drops scale and translate under `prefers-reduced-motion`, or when the app sets `html[data-motion="reduced"]` (for an in-app setting). |
| **List highlights never animate.** The highlight must track the pointer and arrow keys 1:1. | Menu and command items have no transition. |

The core ships with **no JS animation library**. Two opt-in exceptions, never required by a core component:

- `@quireui/text-morph` (torph) morphs text letter by letter. It uses the foundation timing (220ms, `--qui-ease-out`) and the same instant rules.
- Pro blocks may use Motion where springs or layout animation genuinely help.

### Motion utilities

| Utility | Use for |
| --- | --- |
| `motion-pop` | Popover, menu, tooltip, select. Scales from the trigger. |
| `motion-dialog` | Dialogs and sheets. Small lift, no zoom. |
| `motion-fade` | Backdrops, anything opacity-only. |
| `motion-control` | Hover and press colour feedback on controls. |
| `motion-swap` | Label swaps inside a control. Stack the states in one grid cell and mark inactive ones `data-swap="out"`, so the width never changes. |
| `motion-message` | Messages appearing under a control, like field errors. A short fade and drop. |

## 2. Speed

- **No barrel files.** Every component is its own entry, so unused code never ships.
- **React Compiler friendly.** No manual `useMemo` or `useCallback`, `ref` as a normal prop, no `forwardRef`.
- **Zero layout shift.** Loading states keep their size (`Button loading` keeps its width). Skeletons match the real layout.
- **Server components by default.** `"use client"` only where interaction needs it.
- **Icons import from `@phosphor-icons/react/ssr`** so they render on the server.

## 3. Density

Dashboards need more on screen than marketing pages. Set `data-density` on any container:

```html
<div data-density="compact">...</div>   <!-- 28px controls -->
<div data-density="default">...</div>   <!-- 32px controls -->
<div data-density="comfortable">...</div> <!-- 40px controls -->
```

Touch devices (`pointer: coarse`) always get 44px targets, whatever the density.

## 4. Visual style

- **Flat surfaces, 1px borders.** One shadow token (`shadow-float`), used only on floating layers that need separating from the page.
- **No glows, gradients or glass** on components. Personality lives in icons, copy and rare moments.
- **Warm neutrals.** Low-chroma OKLCH greys so long sessions feel calm.
- **Tabular numbers** (`nums` utility) for anything that updates or lines up in columns.
- **Phosphor icons,** regular weight by default. Switching to `fill` is a good way to mark an active state.

## 5. Tokens

Three layers. Components only touch the semantic layer.

1. **Raw:** `--qui-neutral-*`, `--qui-red-*`
2. **Semantic:** `--qui-bg`, `--qui-surface`, `--qui-fg-muted`, `--qui-border`, `--qui-primary`... exposed to Tailwind as `bg-surface`, `text-fg-muted` and so on.
3. **Component:** density variables such as `--qui-control-h`.

Dark mode is a token swap via the `.dark` class. Components never contain `dark:` classes.

## 6. Ship checklist

A component is done when:

- [ ] Fully usable with the keyboard alone, with a visible focus ring only for keyboard focus
- [ ] Uses `motion-*` utilities only, no hand-written transitions
- [ ] Instant under keyboard input, fade-only under reduced motion
- [ ] Works in all three densities and on touch
- [ ] Works in light and dark with no `dark:` classes
- [ ] No layout shift in loading, empty or error states
- [ ] No `forwardRef`, `useMemo` or `useCallback`
- [ ] Typechecks and builds into the registry
