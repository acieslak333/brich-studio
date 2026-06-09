import type { AnimationPreset } from "@demoforge/schema";
import type { MotionCharacter } from "@demoforge/themes";
import type { PanelTiming, TimelineStep } from "@demoforge/components";

/**
 * Panel enter/exit presets → timeline steps, plus serialization of the whole
 * step set into a paused GSAP timeline registered on `window.__timelines[id]`
 * (the seekable contract HyperFrames expects, §1/§6.4).
 *
 * NOTE: the exact timeline-registration contract must be verified against the
 * installed `@hyperframes/core` runtime before wiring real renders (M0); this
 * follows the documented `window.__timelines[<compositionId>]` convention.
 */

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** Selector for a panel root. Mirrors components' `panelRootId`. */
function rootSel(panelId: string): string {
  return `#df-panel-${panelId}`;
}

export function enterStep(
  panelId: string,
  timing: PanelTiming,
  motion: MotionCharacter,
): TimelineStep | null {
  const sel = rootSel(panelId);
  const at = timing.startSec;
  const dur = motion.enterSec;
  const ease = motion.ease;
  const s = motion.slidePx;
  const base = (to: Record<string, unknown>): TimelineStep => ({
    sel,
    op: "from",
    to,
    at,
    dur,
    ease,
  });
  switch (timing.enter as AnimationPreset) {
    case "none":
      return null;
    case "fade":
      return base({ opacity: 0 });
    case "slide-up":
      return base({ opacity: 0, y: s });
    case "slide-down":
      return base({ opacity: 0, y: -s });
    case "slide-left":
      return base({ opacity: 0, x: s });
    case "slide-right":
      return base({ opacity: 0, x: -s });
    case "scale":
      return base({ opacity: 0, scale: 0.92 });
    case "typewriter":
      // panel-level fallback; real typing is emitted by text/terminal blocks
      return base({ opacity: 0 });
    default:
      return base({ opacity: 0 });
  }
}

export function exitStep(
  panelId: string,
  timing: PanelTiming,
  motion: MotionCharacter,
): TimelineStep | null {
  if (timing.exit === "none") return null;
  const sel = rootSel(panelId);
  const dur = motion.exitSec;
  const at = timing.startSec + timing.durationSec - dur;
  const s = motion.slidePx;
  const to: Record<string, unknown> = { opacity: 0 };
  switch (timing.exit as AnimationPreset) {
    case "slide-up":
      to.y = -s;
      break;
    case "slide-down":
      to.y = s;
      break;
    case "slide-left":
      to.x = -s;
      break;
    case "slide-right":
      to.x = s;
      break;
    case "scale":
      to.scale = 0.96;
      break;
    default:
      break;
  }
  return { sel, op: "to", to, at: Math.max(0, at), dur, ease: motion.ease };
}

/** Serialize all steps into a deterministic timeline-builder `<script>`. */
export function renderTimelineScript(
  compositionId: string,
  steps: TimelineStep[],
): string {
  const normalized = steps.map((s) => {
    const out: Record<string, unknown> = {
      sel: s.sel,
      op: s.op,
      to: s.to,
      at: round(s.at),
      dur: round(s.dur),
    };
    if (s.from) out.from = s.from;
    if (s.ease) out.ease = s.ease;
    return out;
  });
  const json = JSON.stringify(normalized);
  const id = JSON.stringify(compositionId);
  return [
    "(function(){",
    `  var steps = ${json};`,
    "  function build(){",
    "    if (typeof window === 'undefined' || !window.gsap) return false;",
    "    var tl = window.gsap.timeline({ paused: true });",
    "    steps.forEach(function(s){",
    "      var vars = Object.assign({}, s.to, { duration: s.dur });",
    "      if (s.ease) vars.ease = s.ease;",
    "      if (s.op === 'set') { tl.set(s.sel, s.to, s.at); }",
    "      else if (s.op === 'fromTo') { tl.fromTo(s.sel, s.from, vars, s.at); }",
    "      else { tl[s.op](s.sel, vars, s.at); }",
    "    });",
    "    window.__timelines = window.__timelines || {};",
    `    window.__timelines[${id}] = tl;`,
    "    return true;",
    "  }",
    "  if (!build() && typeof window !== 'undefined') {",
    "    window.addEventListener('DOMContentLoaded', build);",
    "  }",
    "})();",
  ].join("\n");
}
