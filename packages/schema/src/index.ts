/**
 * @demoforge/schema — Zod schemas + inferred TS types for the project model.
 *
 * Single source of truth for the entire app: the editor, compiler, render
 * server, and LLM agent all validate against these shapes. Every model output
 * is treated as untrusted input and parsed here before use (§9, §13).
 */
export * from "./primitives.js";
export * from "./components.js";
export * from "./project.js";
export * from "./samples.js";
