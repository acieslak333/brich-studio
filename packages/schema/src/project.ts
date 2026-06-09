import { z } from "zod";
import {
  AssetRefSchema,
  AnimationPresetSchema,
  BackgroundSchema,
  GridLayoutSchema,
  IdSchema,
  OutputSettingsSchema,
  SCHEMA_VERSION,
  ThemeIdSchema,
  TransitionIdSchema,
  VariableDefSchema,
} from "./primitives.js";
import { ComponentInstanceSchema } from "./components.js";

/**
 * The top-level project model (§5). A `Project` is a theme + output settings +
 * an ordered `sequence` of scenes, each holding a grid of timed panels.
 */

// --- Panel -----------------------------------------------------------------

export const PanelSchema = z
  .object({
    id: IdSchema,
    // placement: either a named grid area OR explicit spans
    gridArea: z.string().optional(),
    colStart: z.number().int().positive().optional(),
    colSpan: z.number().int().positive().optional(),
    rowStart: z.number().int().positive().optional(),
    rowSpan: z.number().int().positive().optional(),
    // timing relative to the parent scene
    startSec: z.number().nonnegative().default(0),
    durationSec: z.number().positive(),
    enter: AnimationPresetSchema.default("fade"),
    exit: AnimationPresetSchema.default("none"),
    component: ComponentInstanceSchema,
  })
  .refine((p) => p.gridArea !== undefined || p.colStart !== undefined, {
    message: "panel must have either a gridArea or explicit colStart/rowStart",
  });
export type Panel = z.infer<typeof PanelSchema>;

// --- Scene -----------------------------------------------------------------

export const SceneSchema = z.object({
  id: IdSchema,
  name: z.string(),
  durationSec: z.number().positive(),
  layout: GridLayoutSchema,
  panels: z.array(PanelSchema),
  background: BackgroundSchema.optional(),
  transitionIn: TransitionIdSchema.optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

// --- Project ---------------------------------------------------------------

export const ProjectSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: IdSchema,
  name: z.string(),
  theme: ThemeIdSchema,
  output: OutputSettingsSchema,
  sequence: z.array(SceneSchema).min(1, "project needs at least one scene"),
  assets: z.array(AssetRefSchema).default([]),
  variables: z.array(VariableDefSchema).optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// --- Validation / repair ---------------------------------------------------

export type ValidationResult =
  | { ok: true; project: Project }
  | { ok: false; error: z.ZodError };

/** Parse + validate an unknown value as a `Project`. */
export function parseProject(input: unknown): ValidationResult {
  const result = ProjectSchema.safeParse(input);
  return result.success
    ? { ok: true, project: result.data }
    : { ok: false, error: result.error };
}

/** Throwing variant. */
export function assertProject(input: unknown): Project {
  return ProjectSchema.parse(input);
}

/**
 * Format a ZodError into a compact, LLM-friendly list of `path: message`
 * lines — used by the LLM validate→repair loop (§9) to re-ask the model.
 */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.length ? i.path.join(".") : "(root)";
      return `- ${path}: ${i.message}`;
    })
    .join("\n");
}
