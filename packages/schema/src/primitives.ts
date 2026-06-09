import { z } from "zod";

/**
 * Primitive building blocks shared across the project model.
 *
 * Everything here is expressed as a Zod schema; the TypeScript types are
 * *inferred* from the schemas (§5 of the build prompt) so there is a single
 * source of truth and `project.json` always validates against the same shapes.
 */

export const SCHEMA_VERSION = 1 as const;

// --- Identifiers -----------------------------------------------------------

export const IdSchema = z.string().min(1, "id must be non-empty");
export type ID = z.infer<typeof IdSchema>;

// --- Variable references ---------------------------------------------------

/**
 * Any literal block prop/data value may instead be a `"{{varName}}"` reference
 * that the compiler/batch renderer substitutes from project `variables` or a
 * dataset row. This regex matches a single, whole-string reference such as
 * `"{{modelName}}"` or `"{{run.f1}}"`.
 */
export const VAR_REF_RE = /^\{\{\s*[A-Za-z_][\w.-]*\s*\}\}$/;

export const VarRefSchema = z
  .string()
  .regex(VAR_REF_RE, "must be a {{variable}} reference");
export type VarRef = z.infer<typeof VarRefSchema>;

/** Accept a literal value of `schema` OR a `{{variable}}` reference string. */
export function withVarRef<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, VarRefSchema]);
}

/** True when a value is a whole-string variable reference. */
export function isVarRef(value: unknown): value is VarRef {
  return typeof value === "string" && VAR_REF_RE.test(value);
}

/** Extract the bare variable name from a `{{name}}` reference. */
export function varRefName(value: string): string | null {
  const m = value.match(/^\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}$/);
  return m ? (m[1] as string) : null;
}

// --- Themes ----------------------------------------------------------------

export const ThemeIdSchema = z.enum(["swiss", "neobrutalism", "glass-neon"]);
export type ThemeId = z.infer<typeof ThemeIdSchema>;

// --- Output settings -------------------------------------------------------

export const AspectSchema = z.enum(["16:9", "9:16", "1:1", "custom"]);
export type Aspect = z.infer<typeof AspectSchema>;

export const OutputSettingsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.union([z.literal(30), z.literal(60)]),
  format: z.enum(["mp4", "webm", "gif"]),
  aspect: AspectSchema,
});
export type OutputSettings = z.infer<typeof OutputSettingsSchema>;

export const DEFAULT_OUTPUT: OutputSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  format: "mp4",
  aspect: "16:9",
};

// --- Variables -------------------------------------------------------------

export const VariableTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "color",
  "asset",
  "series",
]);
export type VariableType = z.infer<typeof VariableTypeSchema>;

export const VariableDefSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Za-z_][\w.-]*$/, "variable name must be an identifier"),
  type: VariableTypeSchema,
  default: z.unknown().optional(),
});
export type VariableDef = z.infer<typeof VariableDefSchema>;

// --- Animation presets -----------------------------------------------------

export const AnimationPresetSchema = z.enum([
  "none",
  "fade",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "scale",
  "typewriter",
]);
export type AnimationPreset = z.infer<typeof AnimationPresetSchema>;

// --- Transitions (subset; may map onto @hyperframes/shader-transitions) -----

export const TransitionIdSchema = z.enum([
  "none",
  "dissolve",
  "push",
  "wipe",
  "radial",
  "blur",
  "glitch",
]);
export type TransitionId = z.infer<typeof TransitionIdSchema>;

// --- Background ------------------------------------------------------------

export const BackgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("solid"), color: withVarRef(z.string()) }),
  z.object({
    kind: z.literal("gradient"),
    from: withVarRef(z.string()),
    to: withVarRef(z.string()),
    angleDeg: z.number().default(180),
  }),
  z.object({ kind: z.literal("image"), src: withVarRef(z.string()) }),
  z.object({ kind: z.literal("video"), src: withVarRef(z.string()) }),
]);
export type Background = z.infer<typeof BackgroundSchema>;

// --- Grid layout -----------------------------------------------------------

export const GridLayoutSchema = z.object({
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  /** Optional grid-template-areas rows (named layout). */
  areas: z.array(z.string()).optional(),
  gapPx: z.number().nonnegative().default(16),
});
export type GridLayout = z.infer<typeof GridLayoutSchema>;

// --- Assets ----------------------------------------------------------------

export const AssetRefSchema = z.object({
  id: IdSchema,
  kind: z.enum(["image", "video", "audio", "data", "font"]),
  /** Path relative to the project's `/assets` folder, or an absolute URL. */
  src: z.string(),
  name: z.string().optional(),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

// --- Optional real-provider binding (off by default) -----------------------

export const ProviderBindingSchema = z.object({
  kind: z.enum(["tts", "asr", "detection"]),
  /** Implementation id, e.g. "simulated", "piper", "whisper-cpp", "openai". */
  impl: z.string().default("simulated"),
  options: z.record(z.unknown()).optional(),
});
export type ProviderBinding = z.infer<typeof ProviderBindingSchema>;
