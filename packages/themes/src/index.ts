import type { ThemeId } from "@demoforge/schema";

/**
 * @demoforge/themes — three coherent design languages (§8), each expressed as
 * CSS custom properties plus a *motion character* used by enter/exit presets.
 *
 * Tokens are available to the editor preview (as CSS vars) and inlined into the
 * emitted composition HTML, so what you scrub in the editor matches the render.
 */

export interface MotionCharacter {
  /** Default enter duration (seconds) for panel animations. */
  enterSec: number;
  /** Default exit duration (seconds). */
  exitSec: number;
  /** GSAP ease string. */
  ease: string;
  /** Travel distance (px) for slide presets. */
  slidePx: number;
}

export interface Theme {
  id: ThemeId;
  label: string;
  /** CSS custom properties (without the leading `--df-`). */
  tokens: Record<string, string>;
  motion: MotionCharacter;
}

const SWISS: Theme = {
  id: "swiss",
  label: "Swiss / minimal editorial",
  tokens: {
    bg: "#ffffff",
    fg: "#111111",
    muted: "#6b6b6b",
    accent: "#e4002b",
    "accent-fg": "#ffffff",
    border: "#111111",
    "border-width": "1px",
    surface: "#ffffff",
    radius: "0px",
    shadow: "none",
    "font-sans": "'Inter', 'Helvetica Neue', Arial, sans-serif",
    "font-mono": "'IBM Plex Mono', ui-monospace, monospace",
    "text-xs": "13px",
    "text-sm": "15px",
    "text-base": "18px",
    "text-lg": "28px",
    "text-xl": "44px",
    "text-2xl": "72px",
    space: "16px",
    "grid-line": "rgba(0,0,0,0.08)",
    pos: "#1b7f3b",
    neg: "#c2261d",
  },
  motion: { enterSec: 0.4, exitSec: 0.3, ease: "power2.out", slidePx: 28 },
};

const NEOBRUTALISM: Theme = {
  id: "neobrutalism",
  label: "Neobrutalism",
  tokens: {
    bg: "#ffe600",
    fg: "#0a0a0a",
    muted: "#2b2b2b",
    accent: "#ff4d00",
    "accent-fg": "#0a0a0a",
    border: "#0a0a0a",
    "border-width": "3px",
    surface: "#ffffff",
    radius: "2px",
    shadow: "6px 6px 0 0 #0a0a0a",
    "font-sans": "'Archivo', 'Inter', system-ui, sans-serif",
    "font-mono": "'Space Mono', ui-monospace, monospace",
    "text-xs": "13px",
    "text-sm": "16px",
    "text-base": "19px",
    "text-lg": "30px",
    "text-xl": "48px",
    "text-2xl": "80px",
    space: "18px",
    "grid-line": "rgba(0,0,0,0.18)",
    pos: "#108a2b",
    neg: "#d61f1f",
  },
  motion: { enterSec: 0.32, exitSec: 0.22, ease: "back.out(1.7)", slidePx: 40 },
};

const GLASS_NEON: Theme = {
  id: "glass-neon",
  label: "Dark glassmorphism / neon",
  tokens: {
    bg: "#0a0b14",
    fg: "#f3f5ff",
    muted: "#9aa3c7",
    accent: "#7c5cff",
    "accent-fg": "#ffffff",
    border: "rgba(255,255,255,0.14)",
    "border-width": "1px",
    surface: "rgba(255,255,255,0.06)",
    radius: "16px",
    shadow: "0 8px 40px rgba(124,92,255,0.25)",
    "font-sans": "'Inter', system-ui, sans-serif",
    "font-mono": "'JetBrains Mono', ui-monospace, monospace",
    "text-xs": "13px",
    "text-sm": "15px",
    "text-base": "18px",
    "text-lg": "28px",
    "text-xl": "46px",
    "text-2xl": "76px",
    space: "18px",
    "grid-line": "rgba(255,255,255,0.06)",
    pos: "#36e0a0",
    neg: "#ff6b8b",
  },
  motion: { enterSec: 0.5, exitSec: 0.4, ease: "power3.out", slidePx: 32 },
};

export const THEMES: Record<ThemeId, Theme> = {
  swiss: SWISS,
  neobrutalism: NEOBRUTALISM,
  "glass-neon": GLASS_NEON,
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export function getTheme(id: ThemeId): Theme {
  return THEMES[id];
}

/**
 * Render a theme's tokens as a CSS variable block scoped to `selector`
 * (default `:root`). Deterministic key order for byte-stable compiler output.
 */
export function themeCss(id: ThemeId, selector = ":root"): string {
  const theme = THEMES[id];
  const lines = Object.keys(theme.tokens)
    .sort()
    .map((k) => `  --df-${k}: ${theme.tokens[k]};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
}

export function motionFor(id: ThemeId): MotionCharacter {
  return THEMES[id].motion;
}
