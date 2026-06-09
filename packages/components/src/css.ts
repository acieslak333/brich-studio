/**
 * Base stylesheet for emitted compositions. Styles every `.df-*` class used by
 * the emitters purely through `--df-*` theme tokens, so a theme switch restyles
 * everything (§8) and the editor preview matches the render. Static string →
 * deterministic compiler output.
 */
export const BASE_CSS = String.raw`
*, *::before, *::after { box-sizing: border-box; }
.df-stage {
  /* font-family is set per-theme by the compiler with literal names so the
     HyperFrames font scanner can embed the .woff2 (it can't resolve var()). */
  color: var(--df-fg);
  background: var(--df-bg);
}
.df-scene { position: absolute; inset: 0; display: grid; }
.df-panel {
  position: relative; overflow: hidden;
  background: var(--df-surface);
  border: var(--df-border-width) solid var(--df-border);
  border-radius: var(--df-radius);
  box-shadow: var(--df-shadow);
  padding: var(--df-space);
  min-height: 0; min-width: 0;
}

/* text */
.df-text { display: flex; flex-direction: column; gap: 8px; height: 100%; justify-content: center; }
.df-title { font-size: var(--df-text-2xl); font-weight: 800; line-height: 1.02; letter-spacing: -0.02em; }
.df-subtitle { font-size: var(--df-text-lg); color: var(--df-muted); }
.df-bullets { margin: 8px 0 0; padding-left: 1.1em; display: flex; flex-direction: column; gap: 6px; }
.df-bullet { font-size: var(--df-text-base); }
.df-quote { font-size: var(--df-text-xl); font-style: italic; }
.df-attribution { color: var(--df-muted); font-size: var(--df-text-sm); }

/* chart */
.df-chart { display: flex; flex-direction: column; gap: 12px; height: 100%; }
.df-chart-title { font-size: var(--df-text-sm); color: var(--df-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.df-chart-plot { flex: 1; display: flex; align-items: flex-end; gap: 12px; }
.df-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.df-bars { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 4px; }
.df-bar {
  width: 100%; max-width: 64px;
  background: var(--df-bar-color, var(--df-accent));
  transform-origin: bottom center;
  display: flex; align-items: flex-start; justify-content: center;
  position: relative;
}
.df-bar-label { position: absolute; top: -1.4em; font-size: var(--df-text-xs); color: var(--df-fg); }
.df-axis-x { font-size: var(--df-text-xs); color: var(--df-muted); }
.df-chart-svg { flex: 1; width: 100%; }
.df-line { fill: none; stroke: var(--df-accent); stroke-width: 2; stroke-dasharray: 1000; vector-effect: non-scaling-stroke; }
.df-area { fill: var(--df-accent); opacity: 0.18; }
.df-counter { font-size: var(--df-text-2xl); font-weight: 800; color: var(--df-accent); }

/* table */
.df-table-wrap { height: 100%; overflow: hidden; }
.df-table { width: 100%; border-collapse: collapse; font-size: var(--df-text-sm); }
.df-table-title { text-align: left; font-size: var(--df-text-sm); color: var(--df-muted); padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
.df-th { padding: 6px 10px; border-bottom: var(--df-border-width) solid var(--df-border); font-weight: 700; }
.df-td { padding: 6px 10px; border-bottom: 1px solid var(--df-grid-line); }
.df-tr--baseline { color: var(--df-muted); }
.df-diff { font-size: var(--df-text-xs); padding: 0 4px; border-radius: 4px; }
.df-diff--up { color: var(--df-pos); }
.df-diff--down { color: var(--df-neg); }

/* comparison */
.df-comparison { display: flex; flex-direction: column; gap: 4px; height: 100%; }
.df-cmp-title { font-size: var(--df-text-sm); color: var(--df-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
.df-cmp-row { display: grid; grid-template-columns: 1.2fr 1fr 1.4fr; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--df-grid-line); }
.df-cmp-head { color: var(--df-muted); font-size: var(--df-text-xs); text-transform: uppercase; letter-spacing: 0.06em; }
.df-cmp-label { font-weight: 600; }
.df-cmp-before { color: var(--df-muted); }
.df-cmp-after { font-weight: 700; }
.df-cmp-delta { font-size: var(--df-text-xs); font-weight: 600; }
.df-cmp-delta--pos { color: var(--df-pos); }
.df-cmp-delta--neg { color: var(--df-neg); }

/* media */
.df-media { margin: 0; height: 100%; position: relative; }
.df-media-el { width: 100%; height: 100%; display: block; }
.df-media-caption { position: absolute; left: 0; bottom: 0; right: 0; padding: 8px 12px; background: rgba(0,0,0,0.55); color: #fff; font-size: var(--df-text-sm); }

/* code-diff */
.df-code { height: 100%; display: flex; flex-direction: column; font-size: var(--df-text-sm); }
.df-code-header { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; color: var(--df-muted); }
.df-code-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--df-accent); display: inline-block; }
.df-code-lang { margin-left: auto; font-size: var(--df-text-xs); text-transform: uppercase; }
.df-code-body { margin: 0; overflow: hidden; }
.df-line { display: flex; gap: 8px; padding: 1px 0; }
.df-line--add { background: color-mix(in srgb, var(--df-pos) 16%, transparent); }
.df-line--del { background: color-mix(in srgb, var(--df-neg) 16%, transparent); }
.df-gutter { width: 1ch; color: var(--df-muted); user-select: none; }

/* terminal */
.df-terminal { background: #0c0c10; color: #d6f5d6; height: 100%; border-radius: var(--df-radius); overflow: hidden; display: flex; flex-direction: column; }
.df-term-header { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(255,255,255,0.06); color: #aaa; font-size: var(--df-text-xs); }
.df-term-dot { width: 10px; height: 10px; border-radius: 50%; background: #555; display: inline-block; }
.df-term-body { padding: 10px 12px; font-size: var(--df-text-sm); overflow: hidden; }
.df-term-prompt { color: var(--df-accent); }
.df-term-cmd { color: #fff; }
.df-term-out { margin: 2px 0 8px; color: #9fe89f; white-space: pre-wrap; }
.df-term-cursor { display: inline-block; width: 8px; height: 1em; background: #d6f5d6; vertical-align: text-bottom; }

/* tier-2 placeholder card */
.df-card { height: 100%; display: flex; flex-direction: column; gap: 8px; }
.df-card-tag { font-size: var(--df-text-xs); text-transform: uppercase; letter-spacing: 0.08em; color: var(--df-accent); font-weight: 700; }
.df-card-body { margin: 0; flex: 1; overflow: hidden; font-size: var(--df-text-xs); color: var(--df-muted); white-space: pre-wrap; }
.df-card-note { font-size: var(--df-text-xs); color: var(--df-muted); font-style: italic; }
`.trim();
