---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset". Users can invoke this skill directly by typing /shadcn.
---

# shadcn/ui

A framework for building ui, components and design systems. Components are added as source code to the user's project via the CLI.

> **IMPORTANT:** Run all CLI commands using the project's package runner: `npx shadcn@latest`, `pnpm dlx shadcn@latest`, or `bunx --bun shadcn@latest` — based on the project's `packageManager`. Examples below use `npx shadcn@latest` but substitute the correct runner for the project.


## Project Configuration

```json
!`pnpm dlx shadcn@latest info --json`
```

### Key Fields (from components.json)
- **Style**: `radix-mira`
- **isRSC**: `false` — no `"use client"` directive needed
- **Tailwind**: v4, CSS in `src/renderer/src/assets/main.css` — uses `@theme inline` blocks, no `tailwind.config.js`
- **Icon library**: `lucide` — import from `lucide-react`
- **Base**: `radix` — uses `asChild` pattern, not `render`
- **Import alias**: `@/` → `src/renderer/src/`
- **Package manager**: `pnpm` — always use `pnpm dlx shadcn@latest` for CLI commands, `pnpm add` for dependencies
- **Framework**: Vite SPA (React Router v7)
- **Aliases**: `@/components` → `src/renderer/src/components`, `@/lib` → `src/renderer/src/lib`, `@/hooks` → `src/renderer/src/hooks`

## Installed UI Components

Currently installed at `src/renderer/src/components/ui/`: avatar, badge, breadcrumb, button, card, collapsible, dropdown-menu, field, input, label, separator, sheet, sidebar, skeleton, switch, textarea, toggle, toggle-group, tooltip

**Always check this list before importing** — don't import components that haven't been added, and don't re-add ones already installed. Add new components via `pnpm dlx shadcn@latest add <component>`.

## Not Installed (add on demand)

Components commonly needed but not yet installed: select, dialog, alert-dialog, drawer, popover, hover-card, command, table, tabs, pagination, progress, spinner, alert, empty, chart, resizable, scroll-area, accordion, collapsible (note: collapsible IS installed), menubar, context-menu, navigation-menu, calendar, combobox, checkbox, radio-group, input-otp, slider, sonner, badge (note: badge IS installed), avatar (note: avatar IS installed).

## Custom Project Components

These are project-specific components in `src/renderer/src/components/`. Use them when building pages.

| Component | Location | Purpose |
|-----------|----------|---------|
| `TwoColumnLayout` | `@/components/two-column-layout` | Split-pane layout with `left`/`right` ReactNode props and optional `leftClassName`/`rightClassName` |
| `VideoPlayer` | `@/components/video-player` | Video playback with timecode display, frame capture, download |
| `AppSidebar` | `@/components/app-sidebar` | Sidebar with navigation groups |
| `Layout` | `@/components/layout` | App shell with sidebar + header + `<Outlet />` |
| `RootLayout` | `@/components/root-layout` | Wraps app in `<TooltipProvider>` |

## Custom Utilities

| Import | Purpose |
|--------|---------|
| `cn()` from `@/lib/utils` | Conditional class merging (clsx + tailwind-merge) |
| `handleApiError(err, version, fallbackMsg)` from `@/lib/api-errors` | API error handler, returns `{ message, isMissing }` |

## Custom Hooks

| Import | Purpose |
|--------|---------|
| `useTheme()` from `@/hooks/use-theme` | Returns `{ theme, toggleTheme }` — manages `dark` class on `<html>` |
| `useIsMobile()` from `@/hooks/use-mobile` | Responsive hook, returns `boolean` for breakpoint < 768px |

## CSS Utilities (from main.css)

| Utility | Purpose |
|---------|---------|
| `scrollbar-thin` | Thin styled scrollbars (auto-applied globally via `@layer base`) |
| `no-scrollbar` | Hide scrollbars entirely |

## UI Composition Rules

These rules apply specifically to this project (radix-mira style, radix base).

### Styling
- **`className` for layout, not styling** — never override component colors or typography.
- **No `space-x-*` or `space-y-*`** — use `flex` with `gap-*` or `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal** — `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand** — not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` color overrides** — use semantic tokens (`bg-background`, `text-muted-foreground`).
- **Use `cn()` for conditional classes** — don't write template literal ternaries.
- **No manual `z-index` on overlays** — Dialog, Sheet, Popover handle their own stacking.

### Forms
- Forms use `FieldGroup` + `Field` — not raw `div` with form layout classes.
- `InputGroup` uses `InputGroupInput`/`InputGroupTextarea` — not raw `Input`/`Textarea`.
- Option sets (2–7 choices) use `ToggleGroup` — don't loop `Button` with manual active state.
- Validation: `data-invalid` on `Field`, `aria-invalid` on the control. Disabled: `data-disabled` on `Field`, `disabled` on the control.

### Component Structure
- Items always inside their Group: `SelectItem` → `SelectGroup`, `DropdownMenuItem` → `DropdownMenuGroup`, etc.
- Dialog, Sheet, Drawer always need a Title for accessibility. Use `className="sr-only"` if visually hidden.
- `TabsTrigger` must be inside `TabsList`.
- `Avatar` always needs `AvatarFallback` for when the image fails to load.
- Use existing components before custom markup. Check if a component exists before writing a styled `div`.
- Use `Separator` instead of `<hr>` or `border-t`.
- Use `Skeleton` for loading placeholders — no custom `animate-pulse` divs.
- Use `Badge` instead of custom styled spans.

### Icons
- Icons in `Button` use `data-icon="inline-start"` or `data-icon="inline-end"`.
- No sizing classes on icons inside components — components handle sizing via CSS.
- Import from `lucide-react` (the project's icon library).

### Key Pattern Examples

```tsx
// Form layout
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" />
  </Field>
</FieldGroup>

// Validation
<Field data-invalid>
  <FieldLabel>Email</FieldLabel>
  <Input aria-invalid />
  <FieldDescription>Invalid email.</FieldDescription>
</Field>

// Icons in buttons
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

// cn() for conditional classes
<div className={cn("base-class", condition && "active-class")}>

// Two-column layout (project-specific)
<TwoColumnLayout
  left={<LeftPanel />}
  right={<RightPanel />}
/>
```

## Page Creation

This project uses React Router v7 with Vite SPA. Pages are in `src/renderer/src/pages/`.

### Directory Convention

```
src/renderer/src/
├── components/                    # Global components (shared across modules)
│   ├── ui/                        # shadcn/ui components
│   ├── layout.tsx                 # App shell (SidebarProvider + Header + Outlet)
│   ├── app-sidebar.tsx            # Navigation definition
│   └── two-column-layout.tsx      # Project layout component
├── pages/
│   └── <module>/                  # Feature module (e.g. seedance, seedream)
│       ├── components/            # Module shared components
│       │   └── video-player.tsx
│       ├── <sub-menu>/            # Sub-menu folder (complex features)
│       │   ├── components/        # Sub-menu private components
│       │   └── index.tsx          # Page entry — default export
│       ├── flat-page.tsx          # Simple pages stay flat
│       └── types.ts               # Module type definitions
├── lib/                           # Utilities
├── hooks/                         # Custom hooks
└── assets/
    └── main.css                   # Tailwind v4 + CSS variables
```

### Rules
1. **Module folder** — `pages/<module>/` for each feature.
2. **Flat vs folder** — simple pages = flat file. Complex features with multiple components = sub-menu folder with `index.tsx`.
3. **Sub-menu structure** — `pages/<module>/<sub-menu>/index.tsx` as entry, `components/` for private components.
4. **Component layering** — private (sub-menu `components/`) → module-shared (`pages/<module>/components/`) → global (`@/components/`).
5. **Import alias** — always use `@/` prefix. `@/pages/...`, `@/components/...`, `@/lib/...`, `@/hooks/...`.
6. **Default export** — page files export a named function as default: `export default function ModulePage()`.
7. **No barrel files** — import directly from source files.

### Registration Steps

When creating any new page or module, do all three:

**1. Create page files** following the convention above.

**2. Register route** in `src/renderer/src/App.tsx`:
```tsx
import NewPage from '@/pages/<module>/<sub-menu>/index'

// Inside <Routes> <Route element={<Layout />}>
<Route path="/my-module/my-page" element={<NewPage />} />
```

**3. Add sidebar navigation** in `src/renderer/src/components/app-sidebar.tsx`:
```tsx
// In data.navMain array:
{
  title: "Module Name",
  url: "/my-module",
  icon: (<VideoIcon />),  // lucide-react icon
  items: [
    { title: "Page Label", url: "/my-module/my-page" },
  ],
},
```

### Migration Note
Existing modules (`seedance2`, `seedream`) use a flatter structure. New pages should follow the `seedance` convention above. Don't refactor existing modules unless asked.

## Workspace

This is a single-package project (not monorepo). The main process config is in `electron.vite.config.ts`. The renderer uses Vite with `@/` alias configured. Type checking has separate tsconfig files: `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer).

## IPC Pattern

The renderer communicates with the main process through `window.api.*`, pre-exposed in the preload script. Common IPC namespaces used in pages:
- `window.api.file.*` — file operations
- `window.api.seedance.*` — seedance task API
- `window.api.dialog.*` — native dialogs
- `window.api.path.*` — path utilities
- `window.api.taskParams.*` — task parameter persistence

## Adding New shadcn Components

```bash
# Check what's available
pnpm dlx shadcn@latest search @shadcn -q "button"

# Add a component (dry-run first to preview)
pnpm dlx shadcn@latest add dialog --dry-run
pnpm dlx shadcn@latest add dialog

# Get component docs
pnpm dlx shadcn@latest docs dialog select
# Then fetch the URLs returned to see usage examples
```

**After adding**: always read the added files and verify correctness — check imports, sub-components, and adherence to project conventions.

## Component Selection

| Need | Use |
|------|-----|
| Button/action | `Button` with variant |
| Text input | `Input`, `Textarea` (installed) |
| Toggle 2–5 options | `ToggleGroup` + `ToggleGroupItem` (installed) |
| Switch/toggle | `Switch` (installed) |
| Dropdown menu | `DropdownMenu` (installed) |
| Sidebar navigation | `Sidebar` (installed) |
| Breadcrumb | `Breadcrumb` (installed) |
| Card | `Card` + `CardHeader`/`CardTitle`/`CardContent` etc. (installed) |
| Tooltip | `Tooltip` (installed) |
| Separator | `Separator` (installed) |
| Skeleton | `Skeleton` (installed) |
| Badge | `Badge` (installed) |
| Avatar | `Avatar` + `AvatarFallback` (installed) |
| Overlays | Add `dialog` or `sheet` |
| Data display | Add `table` |
| Charts | Add `chart` |

## Detailed References

Refer to the rule files in this skill for code examples:
- [rules/forms.md](./rules/forms.md) — FieldGroup, Field, InputGroup, ToggleGroup, FieldSet, validation
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, Tabs, Avatar, Button loading
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing
- [rules/styling.md](./rules/styling.md) — Semantic colors, spacing, cn(), dark mode
- [rules/base-vs-radix.md](./rules/base-vs-radix.md) — asChild vs render
