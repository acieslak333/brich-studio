import type { Emitter, EmitContext, TimelineStep } from "./types.js";
import { esc, fmtNum, sel, toNum, toText } from "./util.js";

/**
 * Tier-1 block emitters (§7). Each returns static HTML (using `.df-*` classes
 * styled by the compiler's themeable base stylesheet) plus component-internal
 * timeline steps. Panel enter/exit is added by the compiler; these handle the
 * content animation (bars growing, rows revealing, typing, etc.).
 */

const STAGGER = 0.08;

// --- text / title / callout ------------------------------------------------

export const emitText: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as { variant?: string; align?: string };
  const d = (data ?? {}) as {
    title?: unknown;
    subtitle?: unknown;
    items?: unknown[];
    attribution?: unknown;
  };
  const variant = p.variant ?? "title";
  const align = p.align ?? "left";
  const parts: string[] = [];
  const tl: TimelineStep[] = [];
  let i = 0;
  const reveal = (cls: string) => {
    tl.push({
      sel: sel(panelId, `.${cls}`),
      op: "from",
      to: { opacity: 0, y: 12 },
      at: timing.startSec + i * STAGGER,
      dur: 0.4,
    });
    i++;
  };

  if (d.title !== undefined) {
    parts.push(`<div class="df-title">${esc(toText(d.title))}</div>`);
    reveal("df-title");
  }
  if (d.subtitle !== undefined) {
    parts.push(`<div class="df-subtitle">${esc(toText(d.subtitle))}</div>`);
    reveal("df-subtitle");
  }
  if (Array.isArray(d.items) && d.items.length) {
    const lis = d.items
      .map((it) => `<li class="df-bullet">${esc(toText(it))}</li>`)
      .join("");
    parts.push(`<ul class="df-bullets">${lis}</ul>`);
    tl.push({
      sel: sel(panelId, ".df-bullet"),
      op: "from",
      to: { opacity: 0, x: -16, stagger: STAGGER },
      at: timing.startSec + i * STAGGER,
      dur: 0.4,
    });
  }
  if (d.attribution !== undefined) {
    parts.push(
      `<div class="df-attribution">— ${esc(toText(d.attribution))}</div>`,
    );
  }
  return {
    html: `<div class="df-text df-text--${esc(variant)}" style="text-align:${esc(align)}">${parts.join("")}</div>`,
    timeline: tl,
  };
};

// --- chart / metrics -------------------------------------------------------

interface Series {
  name: string;
  color?: string;
  points: { x: string | number; y: unknown }[];
}

export const emitChart: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as { kind?: string; title?: string; showValueLabels?: boolean };
  const series = ((data as { series?: Series[] })?.series ?? []) as Series[];
  const kind = p.kind ?? "bar";
  const title = p.title
    ? `<div class="df-chart-title">${esc(p.title)}</div>`
    : "";
  const showLabels = p.showValueLabels !== false;

  const allY = series.flatMap((s) => s.points.map((pt) => toNum(pt.y)));
  const max = Math.max(1e-9, ...allY);
  const tl: TimelineStep[] = [];

  if (kind === "counter") {
    const last = series[0]?.points.at(-1);
    const value = last ? fmtNum(toNum(last.y)) : "0";
    tl.push({
      sel: sel(panelId, ".df-counter"),
      op: "from",
      to: { opacity: 0, scale: 0.8 },
      at: timing.startSec,
      dur: 0.5,
    });
    return {
      html: `<div class="df-chart df-chart--counter">${title}<div class="df-counter">${esc(value)}</div></div>`,
      timeline: tl,
    };
  }

  if (kind === "line" || kind === "area") {
    const s = series[0];
    const pts = s?.points ?? [];
    const n = Math.max(1, pts.length - 1);
    const coords = pts.map((pt, idx) => {
      const x = (idx / n) * 100;
      const y = 100 - (toNum(pt.y) / max) * 90 - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = `<polyline class="df-line" points="${coords.join(" ")}" />`;
    const area =
      kind === "area" && coords.length
        ? `<polygon class="df-area" points="0,100 ${coords.join(" ")} 100,100" />`
        : "";
    tl.push({
      sel: sel(panelId, ".df-line"),
      op: "fromTo",
      from: { strokeDashoffset: 1000 },
      to: { strokeDashoffset: 0 },
      at: timing.startSec,
      dur: Math.min(1.2, timing.durationSec * 0.6),
      ease: "power1.inOut",
    });
    return {
      html: `<div class="df-chart df-chart--${esc(kind)}">${title}<svg class="df-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">${area}${line}</svg></div>`,
      timeline: tl,
    };
  }

  // bar (default): grouped bars by category index
  const categories = series[0]?.points.map((pt) => pt.x) ?? [];
  const cols = categories
    .map((cat, idx) => {
      const bars = series
        .map((s) => {
          const pt = s.points[idx];
          const y = toNum(pt?.y);
          const h = (y / max) * 100;
          const label = showLabels
            ? `<span class="df-bar-label">${esc(fmtNum(y))}</span>`
            : "";
          const colorVar = s.color ? `--df-bar-color:${esc(s.color)};` : "";
          return `<div class="df-bar" style="height:${h.toFixed(2)}%;${colorVar}">${label}</div>`;
        })
        .join("");
      return `<div class="df-bar-group"><div class="df-bars">${bars}</div><span class="df-axis-x">${esc(toText(cat))}</span></div>`;
    })
    .join("");

  tl.push({
    sel: sel(panelId, ".df-bar"),
    op: "fromTo",
    from: { scaleY: 0 },
    to: { scaleY: 1, stagger: STAGGER, ease: "power2.out" },
    at: timing.startSec,
    dur: 0.5,
  });

  return {
    html: `<div class="df-chart df-chart--bar">${title}<div class="df-chart-plot">${cols}</div></div>`,
    timeline: tl,
  };
};

// --- table -----------------------------------------------------------------

export const emitTable: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as {
    title?: string;
    columns?: { key: string; label: string; align?: string; format?: string }[];
    showDiff?: boolean;
  };
  const d = (data ?? {}) as {
    rows?: Record<string, unknown>[];
    baselineRowIndex?: number;
  };
  const cols = p.columns ?? [];
  const rows = d.rows ?? [];
  const baseIdx = d.baselineRowIndex;
  const baseline = baseIdx !== undefined ? rows[baseIdx] : undefined;
  const title = p.title ? `<caption class="df-table-title">${esc(p.title)}</caption>` : "";

  const thead = cols
    .map((c) => `<th class="df-th" style="text-align:${esc(c.align ?? "left")}">${esc(c.label)}</th>`)
    .join("");

  const body = rows
    .map((row, ri) => {
      const cells = cols
        .map((c) => {
          const raw = row[c.key];
          let badge = "";
          if (p.showDiff && baseline && ri !== baseIdx && typeof raw === "number") {
            const base = toNum(baseline[c.key]);
            const delta = raw - base;
            if (Math.abs(delta) > 1e-9) {
              const dir = delta > 0 ? "up" : "down";
              const sign = delta > 0 ? "▲" : "▼";
              badge = ` <span class="df-diff df-diff--${dir}">${sign}${fmtNum(Math.abs(delta))}</span>`;
            }
          }
          const text = typeof raw === "number" ? fmtNum(raw) : esc(toText(raw));
          return `<td class="df-td" style="text-align:${esc(c.align ?? "left")}">${text}${badge}</td>`;
        })
        .join("");
      const isBase = ri === baseIdx ? " df-tr--baseline" : "";
      return `<tr class="df-tr${isBase}">${cells}</tr>`;
    })
    .join("");

  const tl: TimelineStep[] = [
    {
      sel: sel(panelId, ".df-tr"),
      op: "from",
      to: { opacity: 0, y: 10, stagger: STAGGER },
      at: timing.startSec + 0.1,
      dur: 0.4,
    },
  ];

  return {
    html: `<div class="df-table-wrap"><table class="df-table">${title}<thead><tr>${thead}</tr></thead><tbody>${body}</tbody></table></div>`,
    timeline: tl,
  };
};

// --- comparison (metrics) --------------------------------------------------

export const emitComparison: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as {
    title?: string;
    beforeLabel?: string;
    afterLabel?: string;
  };
  const metrics =
    ((data as { metrics?: unknown[] })?.metrics ?? []) as {
      label: string;
      before: unknown;
      after: unknown;
      unit?: string;
      higherIsBetter?: boolean;
    }[];
  const title = p.title ? `<div class="df-cmp-title">${esc(p.title)}</div>` : "";
  const head = `<div class="df-cmp-row df-cmp-head"><span class="df-cmp-label"></span><span class="df-cmp-before">${esc(p.beforeLabel ?? "Before")}</span><span class="df-cmp-after">${esc(p.afterLabel ?? "After")}</span></div>`;

  const rows = metrics
    .map((m) => {
      const before = toNum(m.before);
      const after = toNum(m.after);
      const unit = m.unit ? esc(m.unit) : "";
      const better = m.higherIsBetter !== false ? after > before : after < before;
      const delta = after - before;
      const cls = delta === 0 ? "" : better ? "df-cmp-delta--pos" : "df-cmp-delta--neg";
      const sign = delta > 0 ? "+" : "";
      return `<div class="df-cmp-row"><span class="df-cmp-label">${esc(m.label)}</span><span class="df-cmp-before">${fmtNum(before)}${unit}</span><span class="df-cmp-after ${cls}">${fmtNum(after)}${unit} <small class="df-cmp-delta">${sign}${fmtNum(delta)}</small></span></div>`;
    })
    .join("");

  const tl: TimelineStep[] = [
    {
      sel: sel(panelId, ".df-cmp-row:not(.df-cmp-head)"),
      op: "from",
      to: { opacity: 0, x: 16, stagger: STAGGER },
      at: timing.startSec + 0.1,
      dur: 0.4,
    },
  ];

  return {
    html: `<div class="df-comparison">${title}${head}${rows}</div>`,
    timeline: tl,
  };
};

// --- media -----------------------------------------------------------------

export const emitMedia: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as { fit?: string; kenBurns?: boolean; caption?: string };
  const d = (data ?? {}) as { kind?: string; src?: unknown };
  const src = esc(toText(d.src));
  const fit = p.fit ?? "cover";
  const el =
    d.kind === "video"
      ? `<video class="df-media-el" src="${src}" style="object-fit:${esc(fit)}" muted></video>`
      : `<img class="df-media-el" src="${src}" alt="" style="object-fit:${esc(fit)}" />`;
  const caption = p.caption
    ? `<div class="df-media-caption">${esc(p.caption)}</div>`
    : "";
  const tl: TimelineStep[] = [];
  if (p.kenBurns) {
    tl.push({
      sel: sel(panelId, ".df-media-el"),
      op: "fromTo",
      from: { scale: 1 },
      to: { scale: 1.08 },
      at: timing.startSec,
      dur: timing.durationSec,
      ease: "none",
    });
  }
  return {
    html: `<figure class="df-media">${el}${caption}</figure>`,
    timeline: tl,
  };
};

// --- code-diff -------------------------------------------------------------

export const emitCodeDiff: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as { language?: string; filename?: string };
  const d = (data ?? {}) as { before?: string; after?: string; diff?: string };
  const header = p.filename
    ? `<div class="df-code-header"><span class="df-code-dot"></span>${esc(p.filename)}<span class="df-code-lang">${esc(p.language ?? "")}</span></div>`
    : "";

  let lines: { text: string; kind: "add" | "del" | "ctx" }[] = [];
  if (d.diff) {
    lines = d.diff.split("\n").map((l) => ({
      text: l,
      kind: l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : "ctx",
    }));
  } else {
    const before = (d.before ?? "").split("\n").filter((l) => l.length || d.before);
    const after = (d.after ?? "").split("\n").filter((l) => l.length || d.after);
    lines = [
      ...before.map((t) => ({ text: t, kind: "del" as const })),
      ...after.map((t) => ({ text: t, kind: "add" as const })),
    ];
  }

  const body = lines
    .map((l) => {
      const gutter = l.kind === "add" ? "+" : l.kind === "del" ? "-" : " ";
      return `<div class="df-line df-line--${l.kind}"><span class="df-gutter">${gutter}</span><code>${esc(l.text)}</code></div>`;
    })
    .join("");

  const tl: TimelineStep[] = [
    {
      sel: sel(panelId, ".df-line"),
      op: "from",
      to: { opacity: 0, x: -8, stagger: 0.05 },
      at: timing.startSec + 0.1,
      dur: 0.3,
    },
  ];

  return {
    html: `<div class="df-code">${header}<pre class="df-code-body">${body}</pre></div>`,
    timeline: tl,
  };
};

// --- terminal --------------------------------------------------------------

export const emitTerminal: Emitter = ({ panelId, props, data, timing }) => {
  const p = props as { prompt?: string; cadenceMs?: number; title?: string };
  const d = (data ?? {}) as {
    steps?: { command: string; output?: string; exitCode?: number }[];
  };
  const prompt = p.prompt ?? "$";
  const steps = d.steps ?? [];
  const header = p.title
    ? `<div class="df-term-header"><span class="df-term-dot"></span><span class="df-term-dot"></span><span class="df-term-dot"></span> ${esc(p.title)}</div>`
    : "";

  const blocks: string[] = [];
  const tl: TimelineStep[] = [];
  let cursor = timing.startSec + 0.2;
  steps.forEach((step, si) => {
    blocks.push(
      `<div class="df-term-line" data-step="${si}"><span class="df-term-prompt">${esc(prompt)}</span> <span class="df-term-cmd">${esc(step.command)}</span></div>`,
    );
    tl.push({
      sel: sel(panelId, `.df-term-line[data-step="${si}"]`),
      op: "from",
      to: { opacity: 0 },
      at: cursor,
      dur: 0.2,
    });
    cursor += 0.4;
    if (step.output) {
      blocks.push(`<pre class="df-term-out" data-step="${si}">${esc(step.output)}</pre>`);
      tl.push({
        sel: sel(panelId, `.df-term-out[data-step="${si}"]`),
        op: "from",
        to: { opacity: 0 },
        at: cursor,
        dur: 0.25,
      });
      cursor += 0.4;
    }
  });

  return {
    html: `<div class="df-terminal">${header}<div class="df-term-body">${blocks.join("")}<span class="df-term-cursor"></span></div></div>`,
    timeline: tl,
  };
};
