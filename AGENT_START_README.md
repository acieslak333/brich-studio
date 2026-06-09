# Build Prompt — "DemoForge": Local, Prompt-Driven Technical Demo Video Studio on HyperFrames

> Paste this whole document into a coding agent (Claude Code, Cursor, Codex, Gemini CLI). It is the spec **and** the working agreement. Build in the milestone order given; each milestone has a Definition of Done you must satisfy before moving on. "DemoForge" is a placeholder name — rename freely. Codename **DemoForge**; the repository is **`acieslak333/brich-studio`** (packages currently use the `@demoforge/*` scope; rename later if desired).

---

## Repository, authorship & push rules (READ FIRST)

These rules govern **every** commit and push in this repo. Configure them before doing any work.

- **Identity.** All commits and pushes MUST be authored as the repository owner — never as "Claude", "Claude Code", an AI assistant, or `noreply@anthropic.com`:
  ```bash
  git config user.name  "acieslak333"
  git config user.email "adam.cieslak333@gmail.com"
  ```
- **No AI/model identifiers** in commit messages, PR titles/bodies, code comments, or any other pushed artifact. Keep the history looking like the owner's own work.
- **Branch.** Develop on the designated feature branch and `git push -u origin <branch>` there. Create the branch locally if needed. Never push to `main` without explicit permission.
- **No PRs unless asked.** Do not open a pull request unless the user explicitly requests one.
- **Build status** is tracked in [`PROGRESS.md`](./PROGRESS.md); update it as milestones land.

---

## 0. Mission (one paragraph)

Build a **local-first, browser-based studio** that turns a natural-language prompt into an editable **animated results / explainer / presentation video** — and lets the user refine it **panel-by-panel** with manual layout control. The **first customer is an AI/NLP team** showing model results and improvements, but the tool is **general-purpose**: charts, tables, animated graphs, audio + spectrograms, images, video clips, before/after comparisons, diagrams, code, math, and narrated explainers. It is an **authoring layer on top of [HeyGen HyperFrames](https://github.com/heygen-com/hyperframes)** (HTML-native, deterministic HTML→MP4 engine). A pluggable LLM agent (local or cloud) plans the video; a curated, distinctively-styled **block library** renders content with **simulated/sample data by default**, with **optional real** providers (data files, TTS/ASR, detection, etc.). The app drives `@hyperframes/engine`/`@hyperframes/producer` directly to render MP4 locally — and, crucially, supports **variable-driven batch rendering** so one template produces a results video per model / run / checkpoint.

---

## 1. Verified facts about HyperFrames (treat installed package + live docs as source of truth)

Confirmed from the repo (verify exact APIs against the installed package types and <https://hyperframes.heygen.com/introduction> before coding the compiler):

- A **composition is a plain HTML file**. Elements carry timing via **data attributes**: `data-composition-id`, `data-start`, `data-duration`, `data-track-index`, `data-width`, `data-height`, `data-volume` (audio). No React, no build step required.
- **Animations are seekable** via adapters (GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI). Convention: register a **paused** timeline on `window.__timelines[<compositionId>]`. The renderer seeks each frame → deterministic output.
- **Rendering**: headless Chrome (Puppeteer) seeks frames → FFmpeg encodes → **MP4**. Local or AWS Lambda.
- **Packages** (npm): `hyperframes` (CLI: `init`/`preview`/`lint`/`inspect`/`render`, `add <block>`), `@hyperframes/core` (types, parsers, generators, **linter**, runtime, frame adapters), `@hyperframes/engine` (Puppeteer+FFmpeg capture), `@hyperframes/producer` (full pipeline: capture + encode + **audio mix**), `@hyperframes/studio` (browser editor — we are NOT using its UI), `@hyperframes/player` (`<hyperframes-player>` web component — usable for preview), `@hyperframes/shader-transitions`, `@hyperframes/aws-lambda`.
- **Catalog blocks** are installable: `npx hyperframes add data-chart`, etc. Reuse where useful instead of rebuilding.
- **Requirements**: Node.js 22+, FFmpeg installed. Apache-2.0.

**Mandatory first step:** install the HyperFrames agent skills and read them — they encode production patterns generic docs miss:
```bash
npx skills add heygen-com/hyperframes
```
Then read `@hyperframes/core` exported types and the docs to confirm the **exact** composition contract (attribute semantics, track model, timeline registration, audio mixing) before writing our compiler. Do not invent attribute behavior — verify it.

---

## 1A. Reuse map & key improvements (researched — do this instead of reinventing)

HyperFrames ships far more than a renderer. **Lean on the catalog + the ecosystem; concentrate our build effort on the project model + compiler, the grid-in-sequence editor, the LLM planner, and the handful of blocks that don't exist yet.**

### Reuse directly from the HyperFrames catalog (`npx hyperframes add <name>`)
- **Charts:** `data-chart` (animated bar+line, value labels). Base for the chart block.
- **Diagrams / pipelines:** `flowchart` (animated decision tree, SVG connectors) → model/data pipelines, architectures.
- **Maps:** `us-map`, `world-map`, choropleth/bubble/flow/hex variants (D3 projections) → any geo data.
- **Captions / kinetic text (15+ components):** highlight, karaoke, clip-wipe, matrix-decode, gradient-fill, neon, editorial-emphasis, etc. → **use these for all narration/voiceover/TTS captions instead of building.**
- **Transitions (huge set):** shader + CSS (dissolve, push, radial, grid, blur, scale, 3D, glitch, light-leak, whip-pan…) → **use for scene changes and before/after comparisons.**
- **Polish overlays:** grain, vignette, shimmer-sweep, parallax-zoom/unzoom (grid reveal — great for "show many results, focus one").

### Reuse HyperFrames *features* (these are the high-leverage wins)
- **Variables** (`concepts/variables`, CLI `--variables`, Lambda `render-batch`): parameterize a composition so the **same template renders different content**. → Our project model must support variable bindings so a team renders **one results video per model/run/checkpoint** from a CSV/JSON. This is the single biggest differentiator for an ML team; design it in from M1, not as an afterthought.
- **Frame adapters** (`concepts/frame-adapters`): bring your own runtime (D3, ECharts, Lottie, Three) into **seekable** compositions. → Don't fight the renderer; wrap external libs as adapters.
- **Website-to-video** (`guides/website-to-video`): capture any site → video. → A fast on-ramp: point it at an existing **W&B / TensorBoard / Grafana / results dashboard** and animate it.
- **HTML-in-Canvas** (`guides/html-in-canvas`): render live HTML as WebGL textures (GPU shaders, 3D). → Optional flourish for hero shots; not core.
- **Output already solved:** 4K supersampling, HDR10, MOV/WebM, transparent-background export. → Wire these to our presets; **do not build encoding.**
- **The Pipeline** (`guides/pipeline`, 7 steps) + **Prompt Guide** (vocabulary tables) + **HTML Schema Reference**: → **Seed the LLM planner's system prompt with these** so generated compositions validate first try. Run `hyperframes lint` before every render.
- **Studio already does timeline editing + a manual DOM-editing inspector** (`guides/timeline-editing`, `contributing/studio-manual-dom-editing`). → Borrow its UX patterns; our differentiators are **grid-of-panels-arranged-in-sequence**, **LLM planning**, the **curated block library**, and **variable/batch rendering** — not a generic timeline.

### Reuse external libraries per content type (wrap as blocks/adapters)
| Content type | Reuse | Notes |
|---|---|---|
| Charts / animated graphs | catalog `data-chart`, **D3**, **ECharts**, **Observable Plot**, Recharts | ECharts/D3 via frame adapter for richer/animated charts & chart races. |
| Tables (animated) | **TanStack Table** (headless) + our styling | Row/cell reveal, value diffs, sort animations. |
| Audio waveform + **spectrogram** | **wavesurfer.js** (+ official spectrogram plugin) | See determinism note below. |
| Before/after **comparison** | **img-comparison-slider** / `<img-comparison-slider>`; side-by-side metric diff is ours | Plus catalog transitions for animated reveals. |
| Code / diffs | **Shiki** (highlighter), `diff`/`diff-match-patch` | Deterministic, theme-able. |
| Math / equations | **KaTeX** | For loss/metric formulas, NLP notation. |
| Diagrams | catalog `flowchart`, **Mermaid** | Pipelines, attention/flow graphs. |
| Network / relation graphs | **Cytoscape.js** / **Sigma.js** | Embeddings/relations/knowledge graphs. |
| Vector motion graphics | **Lottie**, **Rive** | Designer-made motion via existing adapters. |
| Voiceover (TTS) | Piper/Coqui (local) or API; captions from catalog | Word timings drive kinetic captions. |
| Transcription (ASR) | whisper.cpp / faster-whisper (local) or API | Word timings reused for highlight/waveform sync. |

**Tools worth learning from (don't depend on, but borrow ideas):** Remotion (HyperFrames' inspiration — React-as-frames, mature Lambda batch), **Motion Canvas / Revideo** (generator-based, deterministic, excellent for hand-crafted explainer/math animations and a "slides" presentation mode — study its scene API and presentation mode), Manim (math explainers), Slidev / Reveal.js (dev presentations).

### Determinism rule (critical, applies everywhere)
HyperFrames renders by **seeking frames**, not playing wall-clock. Anything time-based — audio, spectrograms, waveforms, live FFT, typing, streaming — **must be precomputed offline** (FFT/peaks, word timings, token schedules) and then **driven by the seekable timeline** (`window.__timelines[id]`) or a frame adapter. Never rely on live audio playback or `requestAnimationFrame` wall-clock. For audio/spectrogram specifically: precompute the spectrogram image + peaks (wavesurfer can export, or generate offline) and animate a playhead/reveal over the static image.

---

## 2. Decisions already made (do not re-litigate)

| Area | Decision |
|---|---|
| LLM | **Pluggable**: local (Ollama / llama.cpp / LM Studio / vLLM via OpenAI-compatible endpoint) **and** cloud (OpenAI, Anthropic), one interface, configurable in UI + `.env`. |
| Build approach | **Custom React editor** that calls `@hyperframes/engine`/`@hyperframes/producer` directly. **Not** building on `@hyperframes/studio` UI (may borrow its player). |
| Real vs simulated content | **Simulate by default**, real providers **optional** behind feature flags (TTS, ASR, detection). |
| Demo structure | **Grid layouts (multiple panels per scene) arranged into a sequence.** |
| Themes (ship all three) | **Swiss / minimal editorial**, **Neobrutalism**, **Dark glassmorphism / neon**. Distinctive — explicitly *not* default-shadcn look (inspiration: <https://github.com/voltagent/awesome-design-md>). |
| Block library (general-purpose) | **Tier 1 (v1 core):** chart/metrics, table, before/after comparison, image/media, code-diff, terminal/log, callout/title/text. **Tier 2 (v1 if time, else v1.1):** audio waveform + spectrogram, LLM chat + token stream, NLP tokens/attention/NER, object detection boxes, API/JSON, diagram (flowchart/mermaid), network graph, math (KaTeX). All simulate-by-default; reuse catalog + libs per §1A. |
| Locality | Runs entirely on the user's machine. Cloud LLM/providers optional. |

---

## 3. Tech stack (defaults — choose these unless you hit a hard blocker)

- **Monorepo**: pnpm workspaces, Node 22+. (HyperFrames itself uses Bun; our app uses pnpm/Node for ecosystem breadth. Rendering runs in the Node runtime — never edge.)
- **App**: Next.js (App Router) + TypeScript + React 18 + Tailwind CSS.
- **Components**: shadcn-style **copy-in registry** (own the source), Radix primitives for interactive bits, **CVA** for variants, design tokens as CSS variables for theming.
- **Editor state**: Zustand (+ Immer). Validation everywhere with **Zod**.
- **Render service**: a Node process exposing render endpoints (a dedicated `apps/render-server` using Express/Fastify is cleanest; a Next route handler pinned to the Node runtime is acceptable). Uses `@hyperframes/producer`. Streams progress via SSE.
- **Persistence**: filesystem. Each project = a folder with `project.json` + `/assets` + `/renders`. No DB in v1.
- **Preview**: scrubbable preview of the current scene via `@hyperframes/player` (or a sandboxed iframe loading the compiled scene HTML).

Output presets: 1920×1080, 1280×720, 1080×1920 (9:16), 1080×1080 (1:1); fps 30/60; formats mp4 (H.264) primary, webm + gif export. Default 1920×1080@30 mp4.

---

## 4. Repo layout

```
demoforge/
├─ apps/
│  ├─ studio/                 # Next.js editor UI
│  └─ render-server/          # Node service: project.json -> compile -> @hyperframes/producer -> MP4
├─ packages/
│  ├─ schema/                 # Zod schemas + TS types for the project model (shared)
│  ├─ compiler/               # Project model -> HyperFrames composition HTML(s)
│  ├─ components/             # The 9 demo components (editor preview + HyperFrames emitter)
│  ├─ themes/                 # 3 themes: tokens + per-theme styles + motion character
│  ├─ llm/                    # Pluggable LLM providers + prompt->DemoPlan agent
│  └─ providers/              # Optional real TTS/ASR/detection adapters (+ simulated defaults)
├─ projects/                  # User projects on disk (gitignored)
├─ examples/                  # Sample project.json files used in tests
└─ package.json               # pnpm workspace root
```

---

## 5. Data model (`packages/schema`) — implement as Zod schemas, infer TS types

```ts
type ID = string;

interface Project {
  schemaVersion: 1;
  id: ID;
  name: string;
  theme: ThemeId;                 // active theme
  output: OutputSettings;
  sequence: Scene[];              // ordered; renders back-to-back
  assets: AssetRef[];
  variables?: VariableDef[];      // named, typed params referenced by blocks as {{var}}
}

// Any block prop/data value may be a literal OR a "{{varName}}" reference.
// A batch render takes a dataset (CSV/JSON rows) and emits one video per row,
// binding row fields to variables. Map this onto HyperFrames' own `variables`
// + CLI `--variables` / Lambda `render-batch` rather than inventing a parallel system.
interface VariableDef { name: string; type: 'string'|'number'|'boolean'|'color'|'asset'|'series'; default?: unknown; }

type ThemeId = 'swiss' | 'neobrutalism' | 'glass-neon';

interface OutputSettings {
  width: number; height: number; fps: 30 | 60;
  format: 'mp4' | 'webm' | 'gif';
  aspect: '16:9' | '9:16' | '1:1' | 'custom';
}

interface Scene {
  id: ID;
  name: string;
  durationSec: number;            // length of this scene on the master timeline
  layout: GridLayout;             // CSS grid for this scene
  panels: Panel[];
  background?: Background;         // solid | gradient | image | video | none
  transitionIn?: TransitionId;    // optional; may use @hyperframes/shader-transitions
}

interface GridLayout {
  columns: number; rows: number;
  areas?: string[];               // grid-template-areas rows; optional named layout
  gapPx: number;
}

interface Panel {
  id: ID;
  // placement: either named area OR explicit spans
  gridArea?: string;
  colStart?: number; colSpan?: number; rowStart?: number; rowSpan?: number;
  startSec: number;               // relative to scene start
  durationSec: number;            // relative to scene
  enter?: AnimationPreset;        // fade/slide/scale/typewriter/none
  exit?: AnimationPreset;
  component: ComponentInstance;
}

type ComponentType =
  // Tier 1 (v1 core)
  | 'chart' | 'table' | 'comparison' | 'media' | 'code-diff' | 'terminal' | 'text'
  // Tier 2 (v1 if time, else v1.1)
  | 'audio' | 'llm-chat' | 'nlp' | 'detection' | 'api-flow' | 'diagram' | 'graph' | 'math';

interface ComponentInstance {
  type: ComponentType;
  props: Record<string, unknown>; // typed per component (Zod per type)
  data?: DemoData;                // simulated content OR a provider request spec
  provider?: ProviderBinding;     // optional real provider (off by default)
}
```

Define a discriminated Zod union over `ComponentType` so each component has fully typed `props` + `data`. The whole `project.json` must validate; reject/repair invalid input.

---

## 6. Compiler (`packages/compiler`) — the heart

Input: `Project`. Output: HyperFrames composition HTML + an asset manifest, ready for `@hyperframes/producer`.

Approach (verify attribute semantics against `@hyperframes/core` first):

1. **Single master composition** preferred for determinism. The stage is `data-width`/`data-height` from `output`. Compute each scene's absolute offset = sum of prior `durationSec`.
2. Each **Scene** → a `<div class="scene clip">` with absolute `data-start = sceneOffset`, `data-duration = scene.durationSec`, holding a **CSS grid** built from `layout`.
3. Each **Panel** → a positioned grid child; its clip timing is absolute: `data-start = sceneOffset + panel.startSec`, `data-duration = panel.durationSec`, with a `data-track-index` assigned by a track allocator (avoid collisions; audio on dedicated tracks).
4. Each panel's `component` is rendered by its **emitter** (from `packages/components`) into static HTML + a contribution to a single GSAP timeline registered on `window.__timelines[compositionId]`. Enter/exit presets compose into the same timeline at the panel's offset.
5. **Audio** (TTS/ASR clips) → `<audio>` elements with `data-start/data-duration/data-volume`; `@hyperframes/producer` mixes them. Caption/word-timing data drives on-screen text animation.
6. **Fallback path** (implement behind a flag): render each scene as its own composition → MP4, then FFmpeg-concat. Use only if the single-composition timeline gets unwieldy for heavy scenes.

The compiler must be **pure and deterministic**: same `project.json` → byte-stable HTML. Snapshot-test it.

---

## 7. Component library (`packages/components`)

Each block ships as a **trio**:
- **(a) Editor preview**: a React component for the canvas/inspector (live, interactive while editing).
- **(b) HyperFrames emitter**: `emit(props, data, theme, timing) → { html, timeline }` producing static HTML + GSAP timeline steps consumed by the compiler. **Where a catalog block or library exists (see §1A), wrap it here rather than rebuilding.**
- **(c) Schema**: Zod for `props` + `data`, plus sensible **sample defaults** so a block works with zero real data.

Keep (a) and (b) visually identical (share theme tokens + the same DOM/CSS where possible) so preview matches render. Build **Tier 1 first** (M3); Tier 2 can land in M3.1/v1.1.

Block specs (sample-data-by-default; reuse noted):

**Tier 1 — core**
1. **chart / metrics** — animated bar/line/area/counter, chart races, value labels. Reuse catalog `data-chart`; use **ECharts/D3 via a frame adapter** for richer cases. Sim data = series JSON.
2. **table** — animated rows/cells, value diffs (↑/↓ vs baseline), sort/reveal. Built on **TanStack Table** (headless) + theme styling. Sim data = rows JSON.
3. **comparison** — before/after via **img-comparison-slider** (images) and side-by-side metric/diff cards (numbers/text); animated reveal via catalog transitions. Sim data = two variants + optional delta.
4. **media (image/video)** — display, Ken-Burns zoom/pan, crop focus, annotate/callout, caption. Sim data = placeholder asset.
5. **code-diff / walkthrough** — file header; **Shiki** syntax highlight; add/remove gutters; line-by-line focus/reveal. Sim data = before/after or unified diff.
6. **terminal / log** — typed commands + streaming stdout; cursor; ANSI-ish color; configurable cadence. Sim data = scripted command/output pairs.
7. **text / title / callout** — kinetic titles, bullets, lower-thirds, quotes. Reuse catalog **caption components** for kinetic styles. Sim data = strings.

**Tier 2 — domain / advanced**
8. **audio (waveform + spectrogram)** — **wavesurfer.js** + spectrogram plugin; **precompute peaks/FFT offline** and animate a playhead/reveal over a static image (determinism rule, §1A). Optional synced audio track + captions. Sim data = synthetic peaks.
9. **llm-chat + token streaming** — chat bubbles; assistant streams token-by-token at a set tokens/sec; optional "thinking" indicator. Sim data = scripted turns.
10. **nlp tokens / attention / NER** — tokenized text; entity highlights with labels; optional attention heatmap/arcs. Sim data = tokens + spans + (optional) attention matrix.
11. **detection (bounding boxes)** — image/frame with animated boxes, labels, confidence; pop/track. Real provider returns boxes; sim data = static boxes.
12. **api-flow** — request card → animated transit → response card; method/URL/headers/JSON (Shiki); status badge; latency counter. Sim data = request/response pair.
13. **diagram** — pipelines/flows via catalog `flowchart` and/or **Mermaid**. Sim data = node/edge spec.
14. **graph (network)** — relations/embeddings/knowledge graphs via **Cytoscape.js / Sigma.js**, animated layout/reveal. Sim data = nodes/edges.
15. **math** — equations/notation via **KaTeX**, optional term-by-term reveal. Sim data = LaTeX string.

Narration/voiceover is **not a block** — it's a project-level audio track (optional TTS provider) whose word timings drive any block's captions via the reused caption components.

All blocks consume **theme tokens** so a theme switch restyles everything.

---

## 8. Themes (`packages/themes`)

Three themes, each a coherent design language (distinct from default shadcn). Express as CSS variables (color, type scale, radius, border, shadow, spacing) **plus a motion character** used by enter/exit presets:

- **Swiss / minimal editorial** — strict grid, generous whitespace, one accent, no/ް minimal shadow, sharp corners, restrained fast-ease motion. Helvetica/Inter-class type.
- **Neobrutalism** — thick black borders, hard offset shadows, flat saturated blocks, chunky type, snappy spring-ish motion.
- **Dark glassmorphism / neon** — dark base, frosted blur, glow/gradient accents, soft radius, smooth eased motion.

Tokens must be available both to the **editor preview** (Tailwind/CSS vars) and inlined into the **emitted composition HTML** (so renders match). Provide a theme switcher that restyles the whole project live.

---

## 9. LLM agent (`packages/llm`)

**Provider interface** (one abstraction, many backends):
```ts
interface LLMProvider {
  id: string;
  generate(opts: {
    system: string;
    messages: {role:'user'|'assistant'|'system'; content:string}[];
    json?: boolean;          // request strict JSON
    schema?: ZodSchema;      // validate/repair against this
  }): Promise<string>;
}
```
Implement: `OllamaProvider` (default, `http://localhost:11434`), `OpenAICompatProvider` (covers llama.cpp server / LM Studio / vLLM / OpenAI — base URL + key configurable), `AnthropicProvider`. Selectable in settings UI; secrets via `.env`.

**Generation flows:**
- **Whole demo**: `prompt → DemoPlan` (a valid `Project` or a higher-level plan the app expands into one). Use structured-output / JSON mode; for models without it, prompt for strict JSON, parse, and run a **Zod validate → repair** loop (re-ask with the validation error) up to N times.
- **Panel-by-panel**: `generatePanel(sceneContext, instruction) → Panel`, e.g. "add a terminal panel that runs npm install then shows a build log." Also `editPanel`, `regenerateScene`.

**Hard guardrail:** the LLM may only choose from the **whitelisted component types** and emit **validated props/data**. It must **never** emit raw `<script>` or arbitrary HTML into compositions. All animation/HTML comes from our trusted emitters. Treat every model output as untrusted input.

---

## 10. Optional real providers (`packages/providers`)

Interfaces with **simulated default impls** + optional real impls behind feature flags & settings:
```ts
interface TTSProvider { synth(text:string, voice?:string): Promise<{audioPath:string; durationSec:number; wordTimings:WordTiming[]}> }
interface ASRProvider { transcribe(audioPath:string): Promise<{text:string; wordTimings:WordTiming[]}> }
interface DetectionProvider { detect(frame:string): Promise<Box[]> }
```
- **Simulated (default)**: synthetic word timings from text length, synthetic waveform, canned boxes — zero external deps.
- **Real local**: TTS via Piper/Coqui; ASR via whisper.cpp / faster-whisper; detection via onnxruntime + a small YOLO/DETR model.
- **Real API**: pluggable (e.g. OpenAI TTS/Whisper). Keys via `.env`.

Word timings flow into caption/waveform animation so real and simulated paths share the same rendering.

---

## 11. Editor UI (`apps/studio`)

Layout:
- **Top bar**: prompt input (generate demo / regenerate scene / "add a panel that…"), theme switcher, output preset selector, **Render** button + progress.
- **Left**: **Sequence rail** — scene thumbnails, reorder (dnd), add/duplicate/delete scene, per-scene duration.
- **Center**: **Canvas** — live, **scrubbable** preview of the current scene (player web component or sandboxed iframe of compiled scene HTML), with a **grid overlay** for layout editing (set columns/rows/gap, drag panel placement & spans).
- **Right**: **Inspector** — selected panel's typed props, **timing** (start/duration sliders relative to scene), enter/exit animation presets, optional provider binding.
- **Master timeline** (bottom): scenes laid end-to-end with durations; click to seek.

Everything editable manually; the LLM is an accelerator, not a gate. Autosave to `project.json`. Import/export project folder.

---

## 12. Render pipeline (`apps/render-server`)

`POST /render` with `{projectId}` → load `project.json` → `compiler` → composition HTML + assets → `@hyperframes/producer` render → write to `projects/<id>/renders/<timestamp>.mp4`. Stream progress over **SSE** (`/render/:jobId/events`). Simple in-memory job queue (one render at a time in v1). Honor `OutputSettings` (resolution/fps/format; 4K/HDR/webm/transparent are HyperFrames features — wire, don't build). Run a `hyperframes lint`/inspect pass on emitted HTML before rendering and surface errors.

Also expose **`POST /render/batch`** with `{projectId, dataset}` (CSV/JSON rows) → bind each row to project `variables` → emit one video per row (drive via HyperFrames variables/`render-batch`). And an **import on-ramp**: `POST /import/website` using HyperFrames' website-to-video to seed a project from an existing dashboard (W&B/TensorBoard/Grafana/results page).

---

## 13. Security / guardrails

- LLM output is **untrusted**: validate with Zod; only whitelisted component types; never inject model-authored HTML/JS into compositions.
- Preview iframe runs with a strict CSP and `sandbox`; no network from compositions except whitelisted asset origins.
- Provider API keys only server-side (`.env`), never shipped to the client bundle.
- Filesystem writes confined to `projects/`.

---

## 14. Build order & Definition of Done (do these in sequence)

- **M0 — Scaffold + prove HyperFrames.** Monorepo, both apps, install `hyperframes` + skills, verify FFmpeg/Node 22. **DoD:** a script renders an official HyperFrames example to a playable MP4 end-to-end on this machine.
- **M1 — Schema + compiler + render route.** `packages/schema` + `packages/compiler` + `/render`. **DoD:** a hand-written 2-scene `examples/*.json` (no LLM, no real UI) renders to MP4 with correct timing; compiler has snapshot tests.
- **M2 — Themes.** Tokens + 3 themes, plumbed into preview and emitted HTML. **DoD:** same project renders in all 3 themes, visibly distinct, preview matches render.
- **M3 — Block library (Tier 1).** Tier-1 blocks (chart, table, comparison, media, code-diff, terminal, text) as trios, sample-data-by-default, reusing catalog/libs per §1A. **DoD:** every Tier-1 block shows in editor preview *and* renders correctly in MP4; props validated. (Tier-2 blocks land in M3.1.)
- **M4 — Editor UI.** Sequence rail, grid layout editor, inspector, scrubbable canvas, duration controls, theme switcher, autosave. **DoD:** a user can build & render a multi-scene video entirely by hand, no LLM.
- **M5 — LLM agent.** Provider abstraction (Ollama + OpenAI-compat + Anthropic), prompt→Plan with Zod validate/repair, panel-by-panel ops; seed the system prompt with HyperFrames' Pipeline + Prompt Guide + HTML Schema (§1A). **DoD:** a text prompt produces a valid, editable, renderable multi-scene video; works with a local Ollama model and one cloud provider.
- **M5.1 — Variables & batch render.** Variable refs (`{{var}}`) in block props/data; a batch endpoint that takes a CSV/JSON dataset → one video per row via HyperFrames variables/`render-batch`. **DoD:** one template + a 3-row dataset produces 3 correct videos in one run.
- **M6 — Real providers + Tier-2 blocks (optional path).** TTS/ASR/detection interfaces + simulated defaults + ≥1 real local impl each behind flags; audio/spectrogram, llm-chat, nlp, detection, api-flow, diagram, graph, math blocks. Word timings wired into captions/waveform. **DoD:** toggling a real provider changes output; simulated path still works fully offline.
- **M7 — Output & polish.** Presets, aspect ratios, gif/webm export, render queue + progress UI, import/export, lint-before-render, docs/README. **DoD:** all presets render; clean README with setup + quickstart.

---

## 15. Non-goals (v1)

Talking-head/avatar generation (that's HeyGen's core, out of scope), multi-user/real-time collaboration, cloud hosting/auth, AWS Lambda distributed rendering (leave a seam for `@hyperframes/aws-lambda` later), a marketplace.

---

## 16. First actions (M0, run now)

```bash
mkdir demoforge && cd demoforge
# pnpm workspace + Next app in apps/studio, Node server in apps/render-server (set up workspaces)
node -v            # must be >= 22
ffmpeg -version    # must be installed
npx skills add heygen-com/hyperframes   # install + READ the skills
# scaffold a throwaway hyperframes project and render it to confirm the toolchain:
npx hyperframes init _smoketest && cd _smoketest && npx hyperframes render && cd ..
```
Then read `@hyperframes/core` types + the HyperFrames docs, confirm the composition/timeline/audio contract, and only then implement `packages/schema` and `packages/compiler` (M1).

**Working rules:** commit per milestone; **author every commit as the repo owner** (see *Repository, authorship & push rules* above — never as Claude/Claude Code/Anthropic); write tests as you go (compiler snapshots, schema validation, one render smoke test in CI/Docker); keep the simulated path fully offline; never block on cloud keys; ask the user only if a milestone's DoD is genuinely ambiguous.
