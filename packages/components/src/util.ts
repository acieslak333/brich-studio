/** Shared helpers for emitters. All output is HTML-escaped by default. */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape a string for safe interpolation into HTML text or attributes. */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] as string);
}

/** Root element id for a panel; selectors are scoped under this. */
export function panelRootId(panelId: string): string {
  return `df-panel-${panelId}`;
}

/** A selector scoped to a panel root. */
export function sel(panelId: string, inner = ""): string {
  const root = `#${panelRootId(panelId)}`;
  return inner ? `${root} ${inner}` : root;
}

/** Format a number with an optional precision; integers stay integers. */
export function fmtNum(n: number, digits = 2): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(digits);
}

/** Coerce a possibly-`{{var}}`/string value to a number for layout math. */
export function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce a value to a display string. Unresolved `{{var}}` shows as a chip. */
export function toText(v: unknown): string {
  return String(v ?? "");
}
