import { isVarRef, varRefName, type Project, type VariableDef } from "@demoforge/schema";

/**
 * Variable substitution (§5, §12). A binding map provides concrete values for
 * `{{name}}` references; for batch rendering one map is built per dataset row.
 * Unbound references fall back to the variable's `default`, then to a visible
 * placeholder so missing data is obvious rather than silently empty.
 */
export type Bindings = Record<string, unknown>;

/** Build the default binding map from a project's `variables`. */
export function defaultBindings(project: Project): Bindings {
  const out: Bindings = {};
  for (const v of project.variables ?? []) {
    if (v.default !== undefined) out[v.name] = v.default;
  }
  return out;
}

function resolveOne(ref: string, bindings: Bindings): unknown {
  const name = varRefName(ref);
  if (name === null) return ref;
  if (name in bindings) return bindings[name];
  return `[[${name}]]`; // visible unbound placeholder
}

const INLINE_RE = /\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g;

/** Replace every `{{name}}` occurrence inside a larger string (stringified). */
function interpolate(str: string, bindings: Bindings): string {
  return str.replace(INLINE_RE, (_m, name: string) =>
    name in bindings ? String(bindings[name]) : `[[${name}]]`,
  );
}

/**
 * Deep-clone `value`, resolving `{{var}}` references:
 * - a **whole-string** ref (`"{{x}}"`) is replaced by the binding's raw value,
 *   preserving its type (e.g. a number stays a number);
 * - **inline** refs inside a larger string are interpolated as text.
 */
export function resolveVars<T>(value: T, bindings: Bindings): T {
  if (typeof value === "string") {
    const s = value as string;
    const whole: boolean = isVarRef(s);
    if (whole) return resolveOne(s, bindings) as T;
    return (s.includes("{{") ? interpolate(s, bindings) : s) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveVars(v, bindings)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveVars(v, bindings);
    return out as T;
  }
  return value;
}

/** List variable names referenced anywhere in a value (for validation/UX). */
export function collectVarRefs(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    const n = varRefName(value);
    if (n) into.add(n);
  } else if (Array.isArray(value)) {
    for (const v of value) collectVarRefs(v, into);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectVarRefs(v, into);
  }
  return into;
}

export type { VariableDef };
