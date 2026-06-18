# Build status

Tracks the milestones from `AGENT_START_README.md` §14. Update as work lands.

Legend: ✅ done · 🟡 partial · ⬜ not started

## M0 — Scaffold + prove HyperFrames · ✅

- ✅ pnpm + Node 22 monorepo (`pnpm-workspace.yaml`, shared `tsconfig.base.json`).
- ✅ Both apps scaffolded: `apps/render-server` (working compile **+ render**
  pipeline + HTTP service), `apps/studio` (placeholder slot for the M4 editor).
- ✅ Toolchain verified: Node v22, pnpm 10, **FFmpeg 6.1**, **Chrome headless
  shell** (via `hyperframes browser ensure`), HyperFrames v0.6.84 + agent skills.
- ✅ Rendered an **official HyperFrames example to a playable MP4** end-to-end
  (`hyperframes init _smoketest --example swiss-grid` → `render` → 79 KB MP4).
- ✅ Verified the **compiler against the installed v0.6.84 contract** (skill +
  scaffold): single master composition, `class="clip"` on every timed element,
  root `data-start`/`data-duration`, `data-composition-id` only on the root,
  GSAP **vendored locally** (the CDN is blocked in render and offline is the
  rule — this also removed a 45 s headless stall).

## M1 — Schema + compiler + render route · 🟡

- ✅ `packages/schema` — full Zod project model (§5): Project/Scene/Panel,
  output, variables, a discriminated union over **all 15 component types**,
  `{{var}}` reference helpers, validate/repair (`parseProject`/`formatIssues`),
  and sample-data factories. **26 tests.**
- ✅ `packages/compiler` — pure, deterministic `compile(project)` →
  single-composition HTML + asset manifest (§6): scene offsets, greedy track
  allocator, themed enter/exit + per-block internal animation folded into one
  paused GSAP timeline (`window.__timelines[id]`), variable resolution
  (whole-string + inline). **Snapshot + unit tests, 17 tests.**
- ✅ `examples/results-demo.json` — hand-written 2-scene project; validates,
  compiles deterministically, lints clean (0/0), and **renders to MP4** with
  correct layout, theme, fonts, resolved variables, and animation (verified by
  frame extraction).
- ✅ `/render` — `POST /render` compiles **and renders** a project to MP4 via the
  HyperFrames CLI (lint-before-render with `--strict`); `POST /compile` is
  compile-only. **SSE** progress streaming is the remaining nice-to-have.

## M2 — Themes · 🟡

- ✅ `packages/themes` — all three themes (swiss, neobrutalism, glass-neon) as
  CSS-variable token sets + motion character; inlined into emitted HTML scoped
  to `.df-stage`.
- ⬜ Plumb the theme switcher through the (not-yet-built) editor preview and
  confirm "preview matches render" visually.

## M3 — Block library (Tier 1) · 🟡

- ✅ `packages/components` — HyperFrames **emitters** (§7b) for all Tier-1 blocks
  (chart, table, comparison, media, code-diff, terminal, text) + a themed
  placeholder emitter for Tier-2; shared themeable base stylesheet.
- ⬜ The **editor-preview** half (§7a, React) and per-component Zod prop wiring
  land with the editor (M4). Visual MP4 verification waits on the render wiring.

## M4 — Editor UI · ⬜
Placeholder package only (`apps/studio`).

## M5 — LLM agent · ⬜
`packages/llm` not started. Schema's `formatIssues` is ready to drive the
validate→repair loop.

## M5.1 — Variables & batch render · ✅
- ✅ `{{var}}` references resolve in the compiler — whole-string refs are
  type-preserving (a `"{{f1}}"` becomes the number `0.91`, feeding chart/diff
  math), inline refs interpolate as text.
- ✅ Dataset parsing (CSV + JSON, numeric/boolean coercion) in the compiler.
- ✅ `renderBatch` + a `render-batch` CLI + `POST /render/batch` (inline dataset
  or path) → one video per row, output dirs named by a key column.
- ✅ **DoD met:** `examples/batch-demo.json` + `examples/models.csv` (3 rows) →
  3 distinct, correct MP4s in one run (verified: bert-base / roberta-large /
  distilbert render different F1, accuracy, and latency in labels and metrics).

## M6 — Real providers + Tier-2 blocks · ⬜
`packages/providers` not started; Tier-2 blocks use the placeholder emitter.

## M7 — Output & polish · ⬜
Presets/aspect ratios modeled in the schema; export + queue UI not started.

---

### Verified this session

```
pnpm install
pnpm -r typecheck      # 5 packages clean
pnpm test              # 46 tests passing (schema + compiler)

# compile only → a render-ready HyperFrames project dir (index.html + gsap):
pnpm --filter @demoforge/render-server compile \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/compiled"

# compile + render to MP4 (lint-strict, ~15s at draft on 4 cores):
pnpm --filter @demoforge/render-server render \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/render" draft
# → projects/results-demo/render/results-demo.mp4  (1920×1080, glass-neon, animated)

# batch render: one video per dataset row (M5.1):
pnpm --filter @demoforge/render-server render-batch \
  "$PWD/examples/batch-demo.json" "$PWD/examples/models.csv" \
  "$PWD/projects/model-card/batch" draft
# → projects/model-card/batch/{bert-base,roberta-large,distilbert}/*.mp4
```

One-time render prerequisites: `npx hyperframes browser ensure` (downloads the
headless Chrome shell) and the Chrome system libraries (`libnss3`, `libgbm1`, …).
