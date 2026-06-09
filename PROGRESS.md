# Build status

Tracks the milestones from `AGENT_START_README.md` §14. Update as work lands.

Legend: ✅ done · 🟡 partial · ⬜ not started

## M0 — Scaffold + prove HyperFrames · 🟡

- ✅ pnpm + Node 22 monorepo (`pnpm-workspace.yaml`, shared `tsconfig.base.json`).
- ✅ Both apps scaffolded: `apps/render-server` (working compile pipeline + HTTP
  service), `apps/studio` (placeholder slot for the M4 editor).
- ✅ Toolchain verified on this machine: Node v22, pnpm 10, **FFmpeg 6.1** installed.
- ⬜ Install the HyperFrames packages + agent skills and render an **official
  example to a playable MP4** end-to-end. The seam is in place
  (`apps/render-server/src/render.ts` dynamically loads `@hyperframes/producer`
  and fails with actionable next steps); wiring the real capture/encode is the
  remaining M0 task.

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
- ✅ `examples/results-demo.json` — hand-written 2-scene project; validates and
  compiles deterministically (verified in tests + via the CLI).
- 🟡 `/render` — `POST /render` compiles a project to `composition.html` on
  disk; the **MP4 encode** step and **SSE** progress are pending the M0 render
  wiring.

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

## M5.1 — Variables & batch render · 🟡
- ✅ `{{var}}` references resolve in the compiler (per-row bindings supported via
  `compile(project, { bindings })`).
- ⬜ The `/render/batch` endpoint + dataset (CSV/JSON) → one video per row.

## M6 — Real providers + Tier-2 blocks · ⬜
`packages/providers` not started; Tier-2 blocks use the placeholder emitter.

## M7 — Output & polish · ⬜
Presets/aspect ratios modeled in the schema; export + queue UI not started.

---

### Verified this session

```
pnpm install
pnpm -r typecheck      # 4 packages clean
pnpm test              # 46 tests passing (schema + compiler)
pnpm --filter @demoforge/render-server compile \
  "$PWD/examples/results-demo.json" "$PWD/projects/results-demo/compiled"
# → projects/results-demo/compiled/composition.html (14 KB, glass-neon)
```
