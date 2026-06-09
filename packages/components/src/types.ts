import type { AnimationPreset, ComponentType } from "@demoforge/schema";
import type { Theme } from "@demoforge/themes";

/**
 * The emitter half (b) of each block's trio (§7). An emitter turns resolved
 * props + data into static HTML plus a set of timeline steps that the compiler
 * folds into the single paused GSAP timeline on `window.__timelines[id]`.
 *
 * Emitters are pure and deterministic: same input → byte-identical output.
 * They never read wall-clock time (determinism rule, §1A).
 */

export interface PanelTiming {
  /** Absolute start on the master timeline, in seconds. */
  startSec: number;
  /** Panel duration in seconds. */
  durationSec: number;
  enter: AnimationPreset;
  exit: AnimationPreset;
}

export interface EmitContext {
  /** Unique panel id; used to scope element ids/selectors. */
  panelId: string;
  type: ComponentType;
  props: Record<string, unknown>;
  data: unknown;
  theme: Theme;
  timing: PanelTiming;
}

/** A single GSAP timeline contribution, positioned absolutely in seconds. */
export interface TimelineStep {
  /** CSS selector, already scoped to the panel root. */
  sel: string;
  op: "fromTo" | "to" | "from" | "set";
  from?: Record<string, unknown>;
  to: Record<string, unknown>;
  /** Absolute position on the master timeline, in seconds. */
  at: number;
  /** Tween duration in seconds (0 for `set`). */
  dur: number;
  ease?: string;
}

export interface EmitResult {
  /** Static HTML for the panel body (no enclosing panel wrapper). */
  html: string;
  /** Contributions to the master timeline. */
  timeline: TimelineStep[];
}

export type Emitter = (ctx: EmitContext) => EmitResult;
