import type { ComponentType } from "@demoforge/schema";
import type { Emitter } from "./types.js";
import {
  emitChart,
  emitCodeDiff,
  emitComparison,
  emitMedia,
  emitTable,
  emitTerminal,
  emitText,
} from "./tier1.js";
import { emitFallback } from "./fallback.js";

/**
 * Maps every component type to its emitter. Tier-1 blocks have dedicated
 * emitters; Tier-2 currently uses the themed placeholder until their full
 * emitters land (M3.1/M6). The compiler only ever emits through this registry —
 * LLM-authored HTML never reaches a composition (§13).
 */
export const EMITTERS: Record<ComponentType, Emitter> = {
  chart: emitChart,
  table: emitTable,
  comparison: emitComparison,
  media: emitMedia,
  "code-diff": emitCodeDiff,
  terminal: emitTerminal,
  text: emitText,
  audio: emitFallback,
  "llm-chat": emitFallback,
  nlp: emitFallback,
  detection: emitFallback,
  "api-flow": emitFallback,
  diagram: emitFallback,
  graph: emitFallback,
  math: emitFallback,
};

export function getEmitter(type: ComponentType): Emitter {
  return EMITTERS[type];
}
