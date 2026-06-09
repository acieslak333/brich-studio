# @demoforge/studio (placeholder — M4)

The browser editor UI. **Not yet built** — this directory holds the workspace
slot so the repo layout matches §4 of the build prompt. The editor is milestone
**M4**, after Tier-1 blocks (M3).

Planned stack (§3): Next.js (App Router) + TypeScript + React 18 + Tailwind, a
shadcn-style copy-in registry, Zustand (+ Immer) for editor state, Zod for
validation.

Planned layout (§11):

- **Top bar** — prompt input, theme switcher, output preset, Render + progress.
- **Left** — Sequence rail (scene thumbnails, dnd reorder).
- **Center** — scrubbable Canvas preview (`@hyperframes/player` or sandboxed
  iframe of the compiled scene HTML) with a grid overlay for layout editing.
- **Right** — Inspector (typed props, timing, enter/exit, provider binding).
- **Bottom** — master timeline.

It consumes the already-built packages: `@demoforge/schema` (state shape +
validation), `@demoforge/compiler` (preview compilation), `@demoforge/themes`
(live theme switching), and `@demoforge/components` (the shared editor-preview /
emitter DOM).
