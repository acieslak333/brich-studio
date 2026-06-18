/**
 * @demoforge/compiler — pure, deterministic `Project → HyperFrames composition`.
 */
export { compile } from "./compile.js";
export type { CompileOptions, CompileResult, AssetManifest } from "./compile.js";
export { resolveVars, defaultBindings, collectVarRefs } from "./variables.js";
export type { Bindings } from "./variables.js";
export { parseDataset, inferDatasetFormat } from "./dataset.js";
export type { DatasetRow, DatasetFormat } from "./dataset.js";
export { allocateTracks, VISUAL_TRACK_BASE, AUDIO_TRACK_BASE } from "./tracks.js";
export type { Clip } from "./tracks.js";
export { renderTimelineScript, enterStep, exitStep } from "./timeline.js";
