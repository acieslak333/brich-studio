# @demoforge/compiler

The heart of DemoForge (§6): a **pure, deterministic** function that turns a
`Project` into a single HyperFrames composition (HTML) plus an asset manifest,
ready for `@hyperframes/producer`.

```ts
import { compile } from "@demoforge/compiler";
const { html, manifest, warnings } = compile(project);
```

## Guarantees

- **Deterministic.** Same `project` + `bindings` → byte-identical HTML. This is
  snapshot-tested, so any change to emitted output is reviewable in the diff.
- **Single master composition.** All scenes live in one document for timing
  determinism; the per-scene-then-concat fallback (§6.6) is a later seam.
- **Untrusted-safe.** Component HTML only ever comes from trusted emitters in
  `@demoforge/components`; variable values are resolved then escaped. No
  model-authored HTML reaches a composition (§13).

## How it maps to HyperFrames

| Project concept | Emitted as |
| --- | --- |
| `output.width/height` | `.df-stage` `data-width`/`data-height` + pixel box |
| `Scene` | `.df-scene` clip with absolute `data-start`/`data-duration`, CSS grid |
| `Panel` | timed grid child with `data-start`/`data-duration`/`data-track-index` |
| `Panel.component` | emitter HTML + steps in the paused GSAP timeline |
| enter/exit + internal animation | one `window.__timelines[id]` timeline |
| `{{var}}` references | resolved from bindings (batch render = one map per row) |

## Pipeline (internal)

1. **Scene offsets** — absolute start = sum of prior `durationSec`.
2. **Track allocation** (`tracks.ts`) — greedy packing so time-overlapping
   panels get distinct `data-track-index`; audio on a dedicated high band.
3. **Emit** — each panel's component via the `@demoforge/components` registry.
4. **Timeline** (`timeline.ts`) — enter/exit presets (themed motion) + emitter
   steps serialized into one deterministic builder script.
5. **Document** — theme tokens (scoped to `.df-stage`) + base CSS + GSAP + body.

## ⚠️ Verify-before-render

This follows the **documented** HyperFrames contract (`data-*` timing attributes,
`window.__timelines[<compositionId>]`). Before wiring real renders (M0), confirm
the exact attribute semantics and timeline-registration shape against the
installed `@hyperframes/core`, and run `hyperframes lint` on the output.
