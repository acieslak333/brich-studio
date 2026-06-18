# brich-studio (DemoForge)

Local-first, prompt-driven **technical demo video studio** built on
[HyperFrames](https://github.com/heygen-com/hyperframes). Turn a natural-language
prompt into an editable, panel-by-panel **results / explainer video** and render
it to MP4 locally — with variable-driven **batch rendering** so one template
produces a video per model / run / checkpoint.

> Full spec & working agreement: [`AGENT_START_README.md`](./AGENT_START_README.md).
> Live build status: [`PROGRESS.md`](./PROGRESS.md).

## Status

Foundation working end-to-end (M0 ✅, M1 mostly ✅, M5.1 ✅): the **schema**
(project model) and **compiler** (project → HyperFrames composition) are built,
tested, and deterministic, and a project **renders to a real MP4** through the
HyperFrames toolchain (lint-clean, animated, fonts embedded, variables
resolved). **Batch rendering** turns one template + a CSV/JSON dataset into one
video per row — the headline use case for an ML team (one results video per
model / run / checkpoint). See `PROGRESS.md` for the per-milestone breakdown.

## Requirements

- Node.js **22+**, **pnpm** 10+
- **FFmpeg** (for the render step)
- For rendering: headless Chrome (`npx hyperframes browser ensure`) and its
  system libraries (`libnss3`, `libgbm1`, `libatk1.0-0`, …). GSAP is vendored
  locally by the pipeline, so rendering is offline/deterministic.

## Quickstart

```bash
pnpm install
pnpm -r typecheck      # typecheck all packages
pnpm test              # run the test suite (schema + compiler)

# compile the example to a render-ready HyperFrames project (index.html + gsap):
pnpm --filter @demoforge/render-server compile \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/compiled"

# compile + render to MP4:
pnpm --filter @demoforge/render-server render \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/render" draft
# → projects/results-demo/render/results-demo.mp4

# batch render — one video per dataset row (one results video per model/run):
pnpm --filter @demoforge/render-server render-batch \
  "$PWD/examples/batch-demo.json" "$PWD/examples/models.csv" \
  "$PWD/projects/model-card/batch" draft

# or run the render service:
pnpm --filter @demoforge/render-server start
#   POST /compile      { "projectPath": "..." }                      → composition only
#   POST /render       { "projectPath": "...", "quality": "draft" }  → MP4
#   POST /render/batch { "projectPath": "...", "dataset": "csv-or-json" } → one MP4/row
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
