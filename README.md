# Quire UI

> Placeholder name. The final name is not decided yet.

Fast, practical React components for interfaces people use every day. Built on [Base UI](https://base-ui.com), Tailwind CSS v4 and [Phosphor](https://phosphoricons.com) icons. Distributed as source through a shadcn-compatible registry, so the code lives in your project.

Read [FOUNDATIONS.md](./FOUNDATIONS.md) for the rules every component follows.

## Install

Add the registry to `components.json`:

```json
{
  "registries": {
    "@quireui": "https://example.com/r/{name}.json"
  }
}
```

Then add components:

```bash
npx shadcn@latest add @quireui/button @quireui/dialog
```

Import the foundation after Tailwind and render `<InputModality />` once in your root layout:

```css
@import "tailwindcss";
@import "./styles/quireui.css";
```

## Components

| Component | Built on |
| --- | --- |
| Button | Base UI Button |
| Input | Base UI Input |
| Dialog | Base UI Dialog |
| Popover | Base UI Popover |
| Dropdown Menu | Base UI Menu |
| Tooltip | Base UI Tooltip |
| Command Palette | Base UI Dialog + Autocomplete |

## Development

```bash
pnpm install
pnpm typecheck
pnpm registry:build   # writes public/r/*.json
```

## License

MIT. Pro components and blocks are distributed separately under a commercial license.
