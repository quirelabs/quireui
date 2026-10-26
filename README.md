# Quire UI

Fast, practical React components for the tools people use all day: dashboards, admin panels, internal apps. Built on [Base UI](https://base-ui.com), Tailwind CSS v4 and [Phosphor](https://phosphoricons.com) icons, and installed as source with the shadcn CLI, so the code lives in your project.

**Docs and live examples: [quireui.dev](https://quireui.dev)**

Quire UI is in beta. Components can still change, and breaking changes are called out when they happen. If something is awkward or missing, [open a discussion](https://github.com/quirelabs/quireui/discussions) or an [issue](https://github.com/quirelabs/quireui/issues).

## Install

In a project without a `components.json`, run `npx shadcn@latest init` first. Then add the registry to `components.json`:

```json
{
  "registries": {
    "@quireui": "https://quireui.dev/r/{name}.json"
  }
}
```

Add the foundation, which holds the tokens, density and motion every component uses:

```bash
npx shadcn@latest add @quireui/foundation @quireui/input-modality
```

Import it after Tailwind, and render `<InputModality />` once in your root layout:

```css
@import "tailwindcss";
@import "../styles/quireui.css";
```

Then add components:

```bash
npx shadcn@latest add @quireui/button @quireui/dialog @quireui/command
```

The full steps are in the [installation guide](https://quireui.dev/docs/installation).

## Components

| Group | Components |
| --- | --- |
| Controls | Button, Checkbox, Combobox, Field, Form, Input, Radio group, Select, Slider, Switch, Textarea, Toggle group |
| Navigation | Breadcrumb, Pagination, Tabs |
| Data display | Avatar, Badge, Table |
| Layout | Card, Separator |
| Overlays | Alert dialog, Dialog, Hover card, Popover, Sheet, Tooltip |
| Feedback | Progress and Meter, Skeleton, Toast |
| Menus | Command palette, Dropdown menu |
| Utilities | Kbd, Scroll area, Text morph |

Every component follows the rules in [FOUNDATIONS.md](./FOUNDATIONS.md): keyboard first, no layout shift, motion that stays out of the way, and the same tokens in light and dark.

## Development

```bash
pnpm install
pnpm typecheck
pnpm check            # the foundation rules, per component
pnpm registry:build   # writes public/r/*.json
```

## License

MIT. Pro components and blocks are sold separately under a commercial license.
