import type { Background, Panel, Project, Scene } from "@demoforge/schema";
import { getTheme, motionFor, themeCss } from "@demoforge/themes";
import {
  BASE_CSS,
  getEmitter,
  type PanelTiming,
  type TimelineStep,
} from "@demoforge/components";
import { defaultBindings, resolveVars, type Bindings } from "./variables.js";
import { allocateTracks, type Clip } from "./tracks.js";
import { enterStep, exitStep, renderTimelineScript } from "./timeline.js";

/**
 * The compiler (§6): a pure, deterministic `Project → composition HTML + asset
 * manifest`. Same project + bindings → byte-identical HTML (snapshot-tested).
 *
 * Verified against the installed HyperFrames v0.6.84 contract (skill +
 * `hyperframes init` example):
 * - **Single master composition.** One root `data-composition-id` div holds all
 *   clips as flat children; one paused timeline on `window.__timelines[id]`,
 *   registered synchronously (avoids the sub-composition registration stall seen
 *   in headless render).
 * - **Every timed element carries `class="clip"`** + `data-start`/`data-duration`
 *   /`data-track-index`. Same-track clips never overlap in time (track allocator);
 *   visual layering is CSS `z-index`, not the track index.
 * - The root composition div carries `data-start="0"` and `data-duration` (total).
 *
 * Scenes/grids are a DemoForge authoring concept: each panel compiles to a flat
 * clip absolutely positioned at its computed grid-cell rect (deterministic for a
 * fixed output size), so there are no nested timed clips.
 */

// Local by default: the render environment blocks external CDNs, and offline,
// deterministic rendering is the project rule (§1A). The render pipeline copies
// gsap.min.js next to index.html; override `gsapUrl` to point elsewhere.
const DEFAULT_GSAP_URL = "gsap.min.js";

export interface CompileOptions {
  /** Variable bindings (batch render). Defaults from the project if omitted. */
  bindings?: Bindings;
  /** Override the GSAP script URL (e.g. a vendored local copy). */
  gsapUrl?: string;
}

export interface AssetManifest {
  assets: { id: string; kind: string; src: string }[];
}

export interface CompileResult {
  compositionId: string;
  html: string;
  manifest: AssetManifest;
  warnings: string[];
  /** Total composition duration in seconds. */
  durationSec: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function compile(project: Project, opts: CompileOptions = {}): CompileResult {
  const warnings: string[] = [];
  const bindings: Bindings = opts.bindings ?? defaultBindings(project);
  const gsapUrl = opts.gsapUrl ?? DEFAULT_GSAP_URL;
  const compositionId = project.id;
  const theme = getTheme(project.theme);
  const motion = motionFor(project.theme);
  const { width, height } = project.output;

  // 1. Scene offsets + total duration.
  const sceneOffsets: number[] = [];
  let total = 0;
  for (const scene of project.sequence) {
    sceneOffsets.push(total);
    total += scene.durationSec;
  }

  // 2. Collect every timed clip (scene backgrounds + panels) for track allocation.
  const clips: Clip[] = [];
  project.sequence.forEach((scene, si) => {
    const base = sceneOffsets[si]!;
    if (scene.background && scene.background.kind !== "none") {
      clips.push({ id: bgId(scene.id), start: base, end: base + scene.durationSec, audio: false });
    }
    for (const panel of scene.panels) {
      const start = base + panel.startSec;
      if (panel.startSec + panel.durationSec > scene.durationSec + 1e-6) {
        warnings.push(
          `panel ${panel.id} overruns scene ${scene.id} (${panel.startSec}+${panel.durationSec} > ${scene.durationSec})`,
        );
      }
      clips.push({
        id: panel.id,
        start,
        end: start + panel.durationSec,
        audio: panel.component.type === "audio",
      });
    }
  });
  const tracks = allocateTracks(clips);

  // 3. Emit flat clips + collect one master timeline.
  const steps: TimelineStep[] = [];
  const clipHtml: string[] = [];
  project.sequence.forEach((scene, si) => {
    const base = sceneOffsets[si]!;
    if (scene.background && scene.background.kind !== "none") {
      clipHtml.push(renderBackground(scene, base, tracks, warnings));
    }
    for (const panel of scene.panels) {
      clipHtml.push(
        renderPanel(panel, scene, base, {
          compositionId,
          theme,
          motion,
          tracks,
          bindings,
          width,
          height,
          steps,
          warnings,
        }),
      );
    }
  });

  // 4. Assemble the document. Restate literal font-family names (the active
  // theme's) after BASE_CSS so the HyperFrames font scanner — which can't see
  // through `var(--df-font-*)` — embeds the right .woff2 (these names are in the
  // producer's bundled @fontsource set).
  const fontHints =
    `.df-stage{font-family:${theme.tokens["font-sans"]}}\n` +
    `.df-code,.df-terminal,.df-term-header,.df-term-body,.df-term-out,.df-card-body{font-family:${theme.tokens["font-mono"]}}`;
  const styleBlock = `${themeCss(project.theme, ".df-stage")}\n${BASE_CSS}\n${fontHints}`;
  const timelineScript = renderTimelineScript(compositionId, steps);
  const html = renderDocument({
    compositionId,
    width,
    height,
    durationSec: total,
    name: project.name,
    styleBlock,
    gsapUrl,
    clipHtml: clipHtml.join("\n"),
    timelineScript,
  });

  return {
    compositionId,
    html,
    manifest: { assets: project.assets.map((a) => ({ id: a.id, kind: a.kind, src: a.src })) },
    warnings,
    durationSec: total,
  };
}

interface PanelCtx {
  compositionId: string;
  theme: ReturnType<typeof getTheme>;
  motion: ReturnType<typeof motionFor>;
  tracks: Map<string, number>;
  bindings: Bindings;
  width: number;
  height: number;
  steps: TimelineStep[];
  warnings: string[];
}

function renderPanel(panel: Panel, scene: Scene, sceneOffset: number, ctx: PanelCtx): string {
  const track = ctx.tracks.get(panel.id) ?? 1;
  const absStart = sceneOffset + panel.startSec;
  const rect = cellRect(scene, panel, ctx.width, ctx.height, ctx.warnings);

  const timing: PanelTiming = {
    startSec: absStart,
    durationSec: panel.durationSec,
    enter: panel.enter,
    exit: panel.exit,
  };

  // Resolve variable references before emitting (emitters escape all output).
  const props = resolveVars(panel.component.props, ctx.bindings) as Record<string, unknown>;
  const data = resolveVars(panel.component.data, ctx.bindings);

  const { html, timeline } = getEmitter(panel.component.type)({
    panelId: panel.id,
    type: panel.component.type,
    props,
    data,
    theme: ctx.theme,
    timing,
  });

  const enter = enterStep(panel.id, timing, ctx.motion);
  const exit = exitStep(panel.id, timing, ctx.motion);
  if (enter) ctx.steps.push(enter);
  ctx.steps.push(...timeline);
  if (exit) ctx.steps.push(exit);

  const style =
    `position:absolute;left:${px(rect.left)}px;top:${px(rect.top)}px;` +
    `width:${px(rect.width)}px;height:${px(rect.height)}px;z-index:1;`;

  // Regular clips carry id/class="clip"/timing only — NOT data-composition-id,
  // which marks a (sub-)composition host and makes the engine poll for a
  // per-element timeline (the 45s headless stall).
  return [
    `<div id="df-panel-${attr(panel.id)}" class="df-panel clip"`,
    `     data-track-index="${track}" data-start="${num(absStart)}" data-duration="${num(panel.durationSec)}"`,
    `     style="${style}">`,
    html,
    `</div>`,
  ].join("\n");
}

function renderBackground(
  scene: Scene,
  offset: number,
  tracks: Map<string, number>,
  warnings: string[],
): string {
  const track = tracks.get(bgId(scene.id)) ?? 0;
  const bg = backgroundStyle(scene.background, warnings);
  return [
    `<div id="df-bg-${attr(scene.id)}" class="df-bg clip"`,
    `     data-track-index="${track}" data-start="${num(offset)}" data-duration="${num(scene.durationSec)}"`,
    `     style="position:absolute;inset:0;z-index:0;${bg}"></div>`,
  ].join("\n");
}

// --- grid → pixel rect -----------------------------------------------------

function cellRect(scene: Scene, panel: Panel, W: number, H: number, warnings: string[]): Rect {
  const { columns, rows, gapPx } = scene.layout;
  const pad = gapPx;
  if (panel.gridArea) {
    warnings.push(
      `panel ${panel.id} uses named gridArea "${panel.gridArea}"; named-area pixel mapping is not implemented — placed full-bleed`,
    );
    return { left: pad, top: pad, width: W - 2 * pad, height: H - 2 * pad };
  }
  const colStart = panel.colStart ?? 1;
  const colSpan = panel.colSpan ?? 1;
  const rowStart = panel.rowStart ?? 1;
  const rowSpan = panel.rowSpan ?? 1;
  const cellW = (W - 2 * pad - (columns - 1) * gapPx) / columns;
  const cellH = (H - 2 * pad - (rows - 1) * gapPx) / rows;
  return {
    left: pad + (colStart - 1) * (cellW + gapPx),
    top: pad + (rowStart - 1) * (cellH + gapPx),
    width: colSpan * cellW + (colSpan - 1) * gapPx,
    height: rowSpan * cellH + (rowSpan - 1) * gapPx,
  };
}

// --- style helpers ---------------------------------------------------------

function backgroundStyle(bg: Background | undefined, warnings: string[]): string {
  if (!bg || bg.kind === "none") return "";
  switch (bg.kind) {
    case "solid":
      return `background:${cssValue(bg.color)};`;
    case "gradient":
      return `background:linear-gradient(${bg.angleDeg}deg, ${cssValue(bg.from)}, ${cssValue(bg.to)});`;
    case "image":
      return `background-image:url(${cssValue(bg.src)});background-size:cover;background-position:center;`;
    case "video":
      warnings.push("video scene backgrounds are not yet emitted; using none");
      return "";
    default:
      return "";
  }
}

function bgId(sceneId: string): string {
  return `bg:${sceneId}`;
}

function cssValue(v: unknown): string {
  return String(v ?? "").replace(/[\n\r"]/g, "");
}

function attr(v: string): string {
  return v.replace(/"/g, "&quot;");
}

function num(n: number): string {
  return String(Math.round(n * 1e4) / 1e4);
}

function px(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- document --------------------------------------------------------------

interface DocParams {
  compositionId: string;
  width: number;
  height: number;
  durationSec: number;
  name: string;
  styleBlock: string;
  gsapUrl: string;
  clipHtml: string;
  timelineScript: string;
}

function renderDocument(p: DocParams): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${attr(p.name)}</title>
<style>
html, body { margin: 0; padding: 0; }
${p.styleBlock}
</style>
<script src="${attr(p.gsapUrl)}"></script>
</head>
<body>
<div class="df-stage" id="df-stage" data-composition-id="${attr(p.compositionId)}" data-width="${p.width}" data-height="${p.height}" data-start="0" data-duration="${num(p.durationSec)}" style="position:relative;width:${p.width}px;height:${p.height}px;overflow:hidden">
${p.clipHtml}
</div>
<script>
${p.timelineScript}
</script>
</body>
</html>`;
}
