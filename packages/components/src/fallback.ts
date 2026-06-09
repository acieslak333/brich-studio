import type { Emitter, TimelineStep } from "./types.js";
import { esc, sel } from "./util.js";

const LABELS: Record<string, string> = {
  audio: "Audio · waveform / spectrogram",
  "llm-chat": "LLM chat · token stream",
  nlp: "NLP · tokens / NER / attention",
  detection: "Detection · bounding boxes",
  "api-flow": "API flow · request → response",
  diagram: "Diagram · pipeline",
  graph: "Network graph",
  math: "Math · equation",
};

/**
 * Placeholder emitter for Tier-2 blocks (§7, tier 2). Renders an intentional,
 * themed card with a compact data preview so renders are never broken while the
 * full Tier-2 emitters (M3.1/M6) are pending. Deterministic, no scripts.
 */
export const emitFallback: Emitter = ({ panelId, type, props, data, timing }) => {
  const label = LABELS[type] ?? type;
  const preview = JSON.stringify({ props, data }, null, 2).slice(0, 600);
  const tl: TimelineStep[] = [
    {
      sel: sel(panelId, ".df-card"),
      op: "from",
      to: { opacity: 0, y: 10 },
      at: timing.startSec,
      dur: 0.4,
    },
  ];
  return {
    html: `<div class="df-card df-card--placeholder"><div class="df-card-tag">${esc(label)}</div><pre class="df-card-body">${esc(preview)}</pre><div class="df-card-note">Tier-2 emitter pending (M3.1/M6)</div></div>`,
    timeline: tl,
  };
};
