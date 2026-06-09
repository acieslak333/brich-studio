import { z } from "zod";
import { IdSchema, ProviderBindingSchema, withVarRef } from "./primitives.js";

/**
 * The block library data model (§5, §7).
 *
 * Each component is a `{ type, props, data?, provider? }` object. A discriminated
 * union over `type` gives every component fully-typed props + data. Every block
 * ships sensible sample defaults so it renders with zero real data
 * (simulate-by-default, §7c).
 */

export const COMPONENT_TYPES = [
  // Tier 1 (v1 core)
  "chart",
  "table",
  "comparison",
  "media",
  "code-diff",
  "terminal",
  "text",
  // Tier 2 (v1 if time, else v1.1)
  "audio",
  "llm-chat",
  "nlp",
  "detection",
  "api-flow",
  "diagram",
  "graph",
  "math",
] as const;

export const ComponentTypeSchema = z.enum(COMPONENT_TYPES);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

export const TIER1_TYPES = [
  "chart",
  "table",
  "comparison",
  "media",
  "code-diff",
  "terminal",
  "text",
] as const satisfies readonly ComponentType[];

const num = withVarRef(z.number());
const str = withVarRef(z.string());

// ===========================================================================
// Tier 1 — core
// ===========================================================================

// --- chart / metrics -------------------------------------------------------

export const ChartPointSchema = z.object({
  x: z.union([z.string(), z.number()]),
  y: num,
});
export const ChartSeriesSchema = z.object({
  name: z.string(),
  color: z.string().optional(),
  points: z.array(ChartPointSchema),
});
export const ChartPropsSchema = z.object({
  kind: z.enum(["bar", "line", "area", "counter"]).default("bar"),
  title: z.string().optional(),
  stacked: z.boolean().default(false),
  showValueLabels: z.boolean().default(true),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
});
export const ChartDataSchema = z.object({
  series: z.array(ChartSeriesSchema),
});

// --- table -----------------------------------------------------------------

export const TableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  align: z.enum(["left", "center", "right"]).default("left"),
  /** Optional numeric format hint, e.g. "0.00", "0%", "0,0". */
  format: z.string().optional(),
});
export const TablePropsSchema = z.object({
  title: z.string().optional(),
  columns: z.array(TableColumnSchema),
  showDiff: z.boolean().default(false),
  revealRows: z.boolean().default(true),
});
export const TableDataSchema = z.object({
  rows: z.array(z.record(z.union([z.string(), z.number(), z.boolean()]))),
  /** Row index used as the baseline for ↑/↓ diff badges. */
  baselineRowIndex: z.number().int().nonnegative().optional(),
});

// --- comparison (before/after) ---------------------------------------------

export const ComparisonMetricSchema = z.object({
  label: z.string(),
  before: num,
  after: num,
  unit: z.string().optional(),
  higherIsBetter: z.boolean().default(true),
});
export const ComparisonPropsSchema = z.object({
  mode: z.enum(["image", "metrics"]).default("metrics"),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  title: z.string().optional(),
  beforeLabel: z.string().default("Before"),
  afterLabel: z.string().default("After"),
});
export const ComparisonDataSchema = z.object({
  /** image mode */
  beforeSrc: str.optional(),
  afterSrc: str.optional(),
  /** metrics mode */
  metrics: z.array(ComparisonMetricSchema).optional(),
});

// --- media (image/video) ---------------------------------------------------

export const MediaPropsSchema = z.object({
  fit: z.enum(["cover", "contain"]).default("cover"),
  kenBurns: z.boolean().default(false),
  caption: z.string().optional(),
});
export const MediaDataSchema = z.object({
  kind: z.enum(["image", "video"]).default("image"),
  src: str,
});

// --- code-diff / walkthrough ----------------------------------------------

export const CodeDiffPropsSchema = z.object({
  language: z.string().default("ts"),
  filename: z.string().optional(),
  mode: z.enum(["split", "unified"]).default("unified"),
  highlightLines: z.array(z.number().int().positive()).optional(),
});
export const CodeDiffDataSchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  /** A pre-computed unified diff (alternative to before/after). */
  diff: z.string().optional(),
});

// --- terminal / log --------------------------------------------------------

export const TerminalStepSchema = z.object({
  command: z.string(),
  output: z.string().default(""),
  exitCode: z.number().int().default(0),
});
export const TerminalPropsSchema = z.object({
  prompt: z.string().default("$"),
  cadenceMs: z.number().int().positive().default(40),
  title: z.string().optional(),
});
export const TerminalDataSchema = z.object({
  steps: z.array(TerminalStepSchema),
});

// --- text / title / callout ------------------------------------------------

export const TextPropsSchema = z.object({
  variant: z
    .enum(["title", "subtitle", "bullets", "quote", "lower-third", "callout"])
    .default("title"),
  align: z.enum(["left", "center", "right"]).default("left"),
  kinetic: z.boolean().default(true),
});
export const TextDataSchema = z.object({
  title: str.optional(),
  subtitle: str.optional(),
  items: z.array(str).optional(),
  attribution: str.optional(),
});

// ===========================================================================
// Tier 2 — domain / advanced
// ===========================================================================

// --- audio (waveform + spectrogram) ---------------------------------------

export const AudioPropsSchema = z.object({
  showWaveform: z.boolean().default(true),
  showSpectrogram: z.boolean().default(false),
  durationSec: z.number().positive().default(4),
});
export const AudioDataSchema = z.object({
  /** Pre-computed peaks (determinism rule §1A); synthesized if omitted. */
  peaks: z.array(z.number()).optional(),
  spectrogramSrc: z.string().optional(),
  audioSrc: z.string().optional(),
});

// --- llm-chat + token streaming -------------------------------------------

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: str,
  thinkingMs: z.number().int().nonnegative().optional(),
});
export const LlmChatPropsSchema = z.object({
  tokensPerSec: z.number().positive().default(24),
  showThinking: z.boolean().default(true),
});
export const LlmChatDataSchema = z.object({
  turns: z.array(ChatTurnSchema),
});

// --- nlp tokens / attention / NER -----------------------------------------

export const NerSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  label: z.string(),
});
export const NlpPropsSchema = z.object({
  mode: z.enum(["tokens", "ner", "attention"]).default("ner"),
  showLabels: z.boolean().default(true),
});
export const NlpDataSchema = z.object({
  tokens: z.array(z.string()),
  spans: z.array(NerSpanSchema).optional(),
  attention: z.array(z.array(z.number())).optional(),
});

// --- detection (bounding boxes) -------------------------------------------

export const BoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  label: z.string(),
  confidence: z.number().min(0).max(1).default(0.9),
});
export const DetectionPropsSchema = z.object({
  showConfidence: z.boolean().default(true),
  showLabels: z.boolean().default(true),
});
export const DetectionDataSchema = z.object({
  imageSrc: str,
  boxes: z.array(BoxSchema),
});

// --- api-flow --------------------------------------------------------------

export const ApiFlowPropsSchema = z.object({
  showLatency: z.boolean().default(true),
});
export const ApiFlowDataSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  url: str,
  requestBody: z.string().optional(),
  status: z.number().int().default(200),
  responseBody: z.string().optional(),
  latencyMs: z.number().nonnegative().default(120),
});

// --- diagram ---------------------------------------------------------------

export const DiagramNodeSchema = z.object({ id: IdSchema, label: z.string() });
export const DiagramEdgeSchema = z.object({
  from: IdSchema,
  to: IdSchema,
  label: z.string().optional(),
});
export const DiagramPropsSchema = z.object({
  engine: z.enum(["flowchart", "mermaid"]).default("flowchart"),
  direction: z.enum(["LR", "TB"]).default("LR"),
});
export const DiagramDataSchema = z.object({
  nodes: z.array(DiagramNodeSchema).optional(),
  edges: z.array(DiagramEdgeSchema).optional(),
  /** Raw mermaid/flowchart source (alternative to nodes/edges). */
  source: z.string().optional(),
});

// --- graph (network) -------------------------------------------------------

export const GraphNodeSchema = z.object({
  id: IdSchema,
  label: z.string().optional(),
  group: z.string().optional(),
});
export const GraphEdgeSchema = z.object({
  source: IdSchema,
  target: IdSchema,
  weight: z.number().optional(),
});
export const GraphPropsSchema = z.object({
  engine: z.enum(["cytoscape", "sigma"]).default("cytoscape"),
  layout: z.enum(["force", "circle", "grid"]).default("force"),
});
export const GraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

// --- math ------------------------------------------------------------------

export const MathPropsSchema = z.object({
  display: z.boolean().default(true),
  revealByTerm: z.boolean().default(false),
});
export const MathDataSchema = z.object({
  latex: str,
});

// ===========================================================================
// Discriminated union over component type
// ===========================================================================

function component<
  T extends ComponentType,
  P extends z.ZodTypeAny,
  D extends z.ZodTypeAny,
>(type: T, props: P, data: D) {
  return z.object({
    type: z.literal(type),
    props,
    data: data.optional(),
    provider: ProviderBindingSchema.optional(),
  });
}

export const ComponentInstanceSchema = z.discriminatedUnion("type", [
  component("chart", ChartPropsSchema, ChartDataSchema),
  component("table", TablePropsSchema, TableDataSchema),
  component("comparison", ComparisonPropsSchema, ComparisonDataSchema),
  component("media", MediaPropsSchema, MediaDataSchema),
  component("code-diff", CodeDiffPropsSchema, CodeDiffDataSchema),
  component("terminal", TerminalPropsSchema, TerminalDataSchema),
  component("text", TextPropsSchema, TextDataSchema),
  component("audio", AudioPropsSchema, AudioDataSchema),
  component("llm-chat", LlmChatPropsSchema, LlmChatDataSchema),
  component("nlp", NlpPropsSchema, NlpDataSchema),
  component("detection", DetectionPropsSchema, DetectionDataSchema),
  component("api-flow", ApiFlowPropsSchema, ApiFlowDataSchema),
  component("diagram", DiagramPropsSchema, DiagramDataSchema),
  component("graph", GraphPropsSchema, GraphDataSchema),
  component("math", MathPropsSchema, MathDataSchema),
]);
export type ComponentInstance = z.infer<typeof ComponentInstanceSchema>;
