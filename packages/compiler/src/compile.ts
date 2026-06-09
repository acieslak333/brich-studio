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
 * Strategy: a single master composition for determinism. Each scene is an
 * absolutely-timed CSS-grid clip; each panel is a timed grid child rendered by
 * its emitter, with all animation folded into one paused GSAP timeline.
 */

const DEFAULT_GSAP_URL =
  "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";

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
}

interface PreparedPanel {
  panel: Panel;
  absStart: number;
  absDuration: number;
  isAudio: boolean;
}

export function compile(project: Project, opts: CompileOptions = {}): CompileResult {
  const warnings: string[] = [];
  const bindings: Bindings = opts.bindings ?? defaultBindings(project);
  const gsapUrl = opts.gsapUrl ?? DEFAULT_GSAP_URL;
  const compositionId = project.id;
  const theme = getTheme(project.theme);
  const motion = motionFor(project.theme);
  const { width, height } = project.output;

  // 1. Scene offsets + prepared panels with absolute timing.
  const sceneOffsets: number[] = [];
  let offset = 0;
  for (const scene of project.sequence) {
    sceneOffsets.push(offset);
    offset += scene.durationSec;
  }

  const clips: Clip[] = [];
  const prepared = new Map<string, PreparedPanel[]>();
  project.sequence.forEach((scene, si) => {
    const base = sceneOffsets[si]!;
    const list: PreparedPanel[] = [];
    for (const panel of scene.panels) {
      const absStart = base + panel.startSec;
      const absDuration = panel.durationSec;
      if (panel.startSec + panel.durationSec > scene.durationSec + 1e-6) {
        warnings.push(
          `panel ${panel.id} overruns scene ${scene.id} (${panel.startSec}+${panel.durationSec} > ${scene.durationSec})`,
        );
      }
      const isAudio = panel.component.type === "audio";
      clips.push({ id: panel.id, start: absStart, end: absStart + absDuration, audio: isAudio });
      list.push({ panel, absStart, absDuration, isAudio });
    }
    prepared.set(scene.id, list);
  });

  // 2. Track allocation across the whole composition.
  const tracks = allocateTracks(clips);

  // 3. Build scenes + collect timeline steps.
  const allSteps: TimelineStep[] = [];
  const sceneHtml = project.sequence
    .map((scene, si) => renderScene(scene, sceneOffsets[si]!, prepared.get(scene.id)!, {
      compositionId,
      theme,
      motion,
      tracks,
      bindings,
      steps: allSteps,
      warnings,
    }))
    .join("\n");

  // 4. Assemble the document.
  const styleBlock = `${themeCss(project.theme, ".df-stage")}\n${BASE_CSS}`;
  const timelineScript = renderTimelineScript(compositionId, allSteps);
  const html = renderDocument({
    compositionId,
    width,
    height,
    name: project.name,
    styleBlock,
    gsapUrl,
    sceneHtml,
    timelineScript,
  });

  const manifest: AssetManifest = {
    assets: project.assets.map((a) => ({ id: a.id, kind: a.kind, src: a.src })),
  };

  return { compositionId, html, manifest, warnings };
}

interface SceneCtx {
  compositionId: string;
  theme: ReturnType<typeof getTheme>;
  motion: ReturnType<typeof motionFor>;
  tracks: Map<string, number>;
  bindings: Bindings;
  steps: TimelineStep[];
  warnings: string[];
}

function renderScene(
  scene: Scene,
  sceneOffset: number,
  panels: PreparedPanel[],
  ctx: SceneCtx,
): string {
  const gridStyle = gridLayoutStyle(scene);
  const bg = backgroundStyle(scene.background, ctx.warnings);
  const panelHtml = panels
    .map((pp) => renderPanel(pp, ctx))
    .join("\n");
  return [
    `<div class="df-scene" data-composition-id="${attr(ctx.compositionId)}" data-track-index="0"`,
    `     data-start="${num(sceneOffset)}" data-duration="${num(scene.durationSec)}"`,
    `     style="${gridStyle}${bg}">`,
    panelHtml,
    `</div>`,
  ].join("\n");
}

function renderPanel(pp: PreparedPanel, ctx: SceneCtx): string {
  const { panel, absStart, absDuration } = pp;
  const track = ctx.tracks.get(panel.id) ?? 1;
  const placement = panelPlacementStyle(panel);

  const timing: PanelTiming = {
    startSec: absStart,
    durationSec: absDuration,
    enter: panel.enter,
    exit: panel.exit,
  };

  // Resolve variable references before emitting (untrusted-safe: emitters escape).
  const props = resolveVars(panel.component.props, ctx.bindings) as Record<string, unknown>;
  const data = resolveVars(panel.component.data, ctx.bindings);

  const emit = getEmitter(panel.component.type);
  const { html, timeline } = emit({
    panelId: panel.id,
    type: panel.component.type,
    props,
    data,
    theme: ctx.theme,
    timing,
  });

  // panel enter/exit + component-internal steps
  const enter = enterStep(panel.id, timing, ctx.motion);
  const exit = exitStep(panel.id, timing, ctx.motion);
  if (enter) ctx.steps.push(enter);
  ctx.steps.push(...timeline);
  if (exit) ctx.steps.push(exit);

  return [
    `<div id="df-panel-${attr(panel.id)}" class="df-panel" data-composition-id="${attr(ctx.compositionId)}"`,
    `     data-track-index="${track}" data-start="${num(absStart)}" data-duration="${num(absDuration)}"`,
    `     style="${placement}">`,
    html,
    `</div>`,
  ].join("\n");
}

// --- style helpers ---------------------------------------------------------

function gridLayoutStyle(scene: Scene): string {
  const { columns, rows, gapPx, areas } = scene.layout;
  let s = `display:grid;grid-template-columns:repeat(${columns},1fr);grid-template-rows:repeat(${rows},1fr);gap:${gapPx}px;padding:${gapPx}px;`;
  if (areas && areas.length) {
    s += `grid-template-areas:${areas.map((a) => `"${a}"`).join(" ")};`;
  }
  return s;
}

function panelPlacementStyle(panel: Panel): string {
  if (panel.gridArea) return `grid-area:${panel.gridArea};`;
  const colStart = panel.colStart ?? 1;
  const colSpan = panel.colSpan ?? 1;
  const rowStart = panel.rowStart ?? 1;
  const rowSpan = panel.rowSpan ?? 1;
  return `grid-column:${colStart} / span ${colSpan};grid-row:${rowStart} / span ${rowSpan};`;
}

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

/** A possibly-var-ref string used in a CSS value position; rendered literally. */
function cssValue(v: unknown): string {
  return String(v ?? "").replace(/[\n\r"]/g, "");
}

function attr(v: string): string {
  return v.replace(/"/g, "&quot;");
}

function num(n: number): string {
  return String(Math.round(n * 1e4) / 1e4);
}

// --- document --------------------------------------------------------------

interface DocParams {
  compositionId: string;
  width: number;
  height: number;
  name: string;
  styleBlock: string;
  gsapUrl: string;
  sceneHtml: string;
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
${p.styleBlock}
</style>
<script src="${attr(p.gsapUrl)}"></script>
</head>
<body style="margin:0">
<div class="df-stage" data-composition-id="${attr(p.compositionId)}" data-width="${p.width}" data-height="${p.height}" style="position:relative;width:${p.width}px;height:${p.height}px;overflow:hidden">
${p.sceneHtml}
</div>
<script>
${p.timelineScript}
</script>
</body>
</html>`;
}
