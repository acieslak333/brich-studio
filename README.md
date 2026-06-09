# brich-studio (DemoForge)

Local-first, prompt-driven **technical demo video studio** built on
[HyperFrames](https://github.com/heygen-com/hyperframes). Turn a natural-language
prompt into an editable, panel-by-panel **results / explainer video** and render
it to MP4 locally — with variable-driven **batch rendering** so one template
produces a video per model / run / checkpoint.

> Full spec & working agreement: [`AGENT_START_README.md`](./AGENT_START_README.md).
> Live build status: [`PROGRESS.md`](./PROGRESS.md).

## Status

Early foundation in place (M0/M1): the **schema** (project model) and the
**compiler** (project → HyperFrames composition) are built, tested, and
deterministic. The MP4 render seam is scaffolded and awaits the HyperFrames
toolchain. See `PROGRESS.md` for the per-milestone breakdown.

## Requirements

- Node.js **22+**, **pnpm** 10+
- **FFmpeg** (for the render step)

## Quickstart

```bash
pnpm install
pnpm -r typecheck      # typecheck all packages
pnpm test              # run the test suite (schema + compiler)

# compile the example project to a HyperFrames composition (HTML):
pnpm --filter @demoforge/render-server compile \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/compiled"
# → projects/results-demo/compiled/composition.html

# or run the render service:
pnpm --filter @demoforge/render-server start   # POST /render { "projectPath": "..." }
```

## Layout

```
brich-studio/
├─ apps/
│  ├─ studio/          # editor UI (Next.js) — placeholder, M4
│  └─ render-server/   # project.json → compile → composition.html (→ MP4 seam)
├─ packages/
│  ├─ schema/          # Zod project model + types (the source of truth)
│  ├─ compiler/        # Project → HyperFrames composition HTML (the heart)
│  ├─ components/      # block emitters (chart/table/.../15 types) + base CSS
│  └─ themes/          # swiss · neobrutalism · glass-neon (tokens + motion)
├─ examples/           # hand-written project.json fixtures
└─ projects/           # user/compiled output (gitignored)
```

## How it works

A `Project` (validated by `@demoforge/schema`) is an ordered sequence of scenes,
each a CSS grid of timed panels. `@demoforge/compiler` turns it into a **single
master HyperFrames composition**: scenes and panels carry `data-start` /
`data-duration` / `data-track-index`, and all animation is folded into one paused
GSAP timeline on `window.__timelines[id]` that the renderer seeks frame-by-frame
for deterministic output. Themes inline as CSS variables so the render matches
the editor preview.

## License

Apache-2.0 (matching HyperFrames). See the build prompt for details.
