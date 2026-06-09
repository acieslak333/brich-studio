import { DEFAULT_OUTPUT } from "./primitives.js";
import {
  ComponentInstanceSchema,
  type ComponentInstance,
  type ComponentType,
} from "./components.js";
import { ProjectSchema, type Project } from "./project.js";

/**
 * Sample-data-by-default factories (§7c). Every block works with zero real
 * data; these supply realistic ML-flavoured placeholders. Each is parsed
 * through the schema so defaults are applied and the result is always valid.
 */

const RAW_SAMPLES: Record<ComponentType, unknown> = {
  chart: {
    type: "chart",
    props: { kind: "bar", title: "F1 by checkpoint", showValueLabels: true },
    data: {
      series: [
        {
          name: "F1",
          points: [
            { x: "ckpt-1k", y: 0.71 },
            { x: "ckpt-5k", y: 0.79 },
            { x: "ckpt-10k", y: 0.84 },
            { x: "ckpt-20k", y: 0.88 },
          ],
        },
      ],
    },
  },
  table: {
    type: "table",
    props: {
      title: "Per-class metrics",
      columns: [
        { key: "label", label: "Class", align: "left" },
        { key: "precision", label: "P", align: "right" },
        { key: "recall", label: "R", align: "right" },
        { key: "f1", label: "F1", align: "right" },
      ],
      showDiff: true,
    },
    data: {
      baselineRowIndex: 0,
      rows: [
        { label: "PERSON", precision: 0.88, recall: 0.84, f1: 0.86 },
        { label: "ORG", precision: 0.81, recall: 0.79, f1: 0.8 },
        { label: "LOC", precision: 0.92, recall: 0.9, f1: 0.91 },
      ],
    },
  },
  comparison: {
    type: "comparison",
    props: { mode: "metrics", title: "Baseline vs Fine-tuned" },
    data: {
      metrics: [
        { label: "Accuracy", before: 0.82, after: 0.9, unit: "" },
        { label: "F1", before: 0.79, after: 0.88, unit: "" },
        { label: "Latency", before: 240, after: 180, unit: "ms", higherIsBetter: false },
      ],
    },
  },
  media: {
    type: "media",
    props: { fit: "cover", kenBurns: true, caption: "Sample frame" },
    data: { kind: "image", src: "{{heroImage}}" },
  },
  "code-diff": {
    type: "code-diff",
    props: { language: "python", filename: "train.py", mode: "unified" },
    data: {
      before: "lr = 1e-4\noptimizer = Adam(model.parameters(), lr=lr)",
      after: "lr = 3e-4\noptimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)",
    },
  },
  terminal: {
    type: "terminal",
    props: { prompt: "$", cadenceMs: 35, title: "train.sh" },
    data: {
      steps: [
        { command: "python train.py --epochs 3", output: "epoch 1 loss=1.84\nepoch 2 loss=0.97\nepoch 3 loss=0.61", exitCode: 0 },
        { command: "python eval.py", output: "f1=0.88 acc=0.90", exitCode: 0 },
      ],
    },
  },
  text: {
    type: "text",
    props: { variant: "title", align: "left", kinetic: true },
    data: { title: "Model v2 Results", subtitle: "+9 F1 over baseline" },
  },
  audio: {
    type: "audio",
    props: { showWaveform: true, showSpectrogram: true, durationSec: 4 },
    data: {},
  },
  "llm-chat": {
    type: "llm-chat",
    props: { tokensPerSec: 24, showThinking: true },
    data: {
      turns: [
        { role: "user", content: "Summarize the eval in one line." },
        { role: "assistant", content: "Fine-tuned model improves F1 by 9 points with 25% lower latency.", thinkingMs: 600 },
      ],
    },
  },
  nlp: {
    type: "nlp",
    props: { mode: "ner", showLabels: true },
    data: {
      tokens: ["Apple", "released", "the", "M4", "chip", "in", "Cupertino"],
      spans: [
        { start: 0, end: 1, label: "ORG" },
        { start: 3, end: 5, label: "PRODUCT" },
        { start: 6, end: 7, label: "LOC" },
      ],
    },
  },
  detection: {
    type: "detection",
    props: { showConfidence: true, showLabels: true },
    data: {
      imageSrc: "{{frame}}",
      boxes: [
        { x: 0.12, y: 0.2, w: 0.25, h: 0.4, label: "person", confidence: 0.94 },
        { x: 0.55, y: 0.35, w: 0.3, h: 0.25, label: "laptop", confidence: 0.81 },
      ],
    },
  },
  "api-flow": {
    type: "api-flow",
    props: { showLatency: true },
    data: {
      method: "POST",
      url: "/v1/infer",
      requestBody: '{ "text": "hello world" }',
      status: 200,
      responseBody: '{ "label": "greeting", "score": 0.97 }',
      latencyMs: 112,
    },
  },
  diagram: {
    type: "diagram",
    props: { engine: "flowchart", direction: "LR" },
    data: {
      nodes: [
        { id: "in", label: "Tokenize" },
        { id: "enc", label: "Encoder" },
        { id: "head", label: "Classifier" },
        { id: "out", label: "Label" },
      ],
      edges: [
        { from: "in", to: "enc" },
        { from: "enc", to: "head" },
        { from: "head", to: "out" },
      ],
    },
  },
  graph: {
    type: "graph",
    props: { engine: "cytoscape", layout: "force" },
    data: {
      nodes: [
        { id: "a", label: "king" },
        { id: "b", label: "queen" },
        { id: "c", label: "man" },
        { id: "d", label: "woman" },
      ],
      edges: [
        { source: "a", target: "b", weight: 0.8 },
        { source: "c", target: "d", weight: 0.8 },
        { source: "a", target: "c", weight: 0.5 },
      ],
    },
  },
  math: {
    type: "math",
    props: { display: true, revealByTerm: false },
    data: { latex: "F_1 = 2 \\cdot \\frac{P \\cdot R}{P + R}" },
  },
};

/** A valid, sample-populated component instance for the given type. */
export function sampleComponent(type: ComponentType): ComponentInstance {
  return ComponentInstanceSchema.parse(RAW_SAMPLES[type]);
}

/** A minimal but valid two-scene project, used by examples and tests. */
export function sampleProject(): Project {
  return ProjectSchema.parse({
    schemaVersion: 1,
    id: "sample",
    name: "Sample Results Video",
    theme: "swiss",
    output: DEFAULT_OUTPUT,
    assets: [],
    sequence: [
      {
        id: "scene-title",
        name: "Title",
        durationSec: 3,
        layout: { columns: 1, rows: 1, gapPx: 24 },
        background: { kind: "solid", color: "#ffffff" },
        panels: [
          {
            id: "p-title",
            colStart: 1,
            colSpan: 1,
            rowStart: 1,
            rowSpan: 1,
            startSec: 0,
            durationSec: 3,
            enter: "fade",
            component: RAW_SAMPLES["text"],
          },
        ],
      },
      {
        id: "scene-results",
        name: "Results",
        durationSec: 6,
        layout: { columns: 2, rows: 1, gapPx: 24 },
        panels: [
          {
            id: "p-chart",
            colStart: 1,
            colSpan: 1,
            rowStart: 1,
            rowSpan: 1,
            startSec: 0,
            durationSec: 6,
            enter: "slide-up",
            component: RAW_SAMPLES["chart"],
          },
          {
            id: "p-table",
            colStart: 2,
            colSpan: 1,
            rowStart: 1,
            rowSpan: 1,
            startSec: 0.5,
            durationSec: 5.5,
            enter: "fade",
            component: RAW_SAMPLES["table"],
          },
        ],
      },
    ],
  });
}
