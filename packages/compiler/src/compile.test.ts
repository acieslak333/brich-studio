import { describe, it, expect } from "vitest";
import { sampleProject } from "@demoforge/schema";
import { compile } from "./compile.js";

describe("compile", () => {
  it("is deterministic: same input → byte-identical HTML", () => {
    const p = sampleProject();
    const a = compile(p);
    const b = compile(p);
    expect(a.html).toBe(b.html);
  });

  it("emits a single stage sized from output settings", () => {
    const { html } = compile(sampleProject());
    expect(html).toContain('data-width="1920"');
    expect(html).toContain('data-height="1080"');
    expect(html).toContain("width:1920px;height:1080px");
  });

  it("places scenes at cumulative offsets", () => {
    const { html } = compile(sampleProject());
    // scene 1 at 0 (dur 3), scene 2 at 3 (dur 6)
    expect(html).toContain('class="df-scene"');
    expect(html).toMatch(/df-scene[^>]*data-start="0"[^>]*data-duration="3"/s);
    expect(html).toMatch(/df-scene[^>]*data-start="3"[^>]*data-duration="6"/s);
  });

  it("gives panels absolute timing relative to their scene", () => {
    const { html } = compile(sampleProject());
    // chart panel: scene2 offset 3 + startSec 0 = 3
    expect(html).toContain('id="df-panel-p-chart"');
    expect(html).toMatch(/df-panel-p-chart[^>]*data-start="3"/s);
    // table panel: 3 + 0.5 = 3.5
    expect(html).toMatch(/df-panel-p-table[^>]*data-start="3.5"/s);
  });

  it("registers a paused timeline on window.__timelines[id]", () => {
    const { html } = compile(sampleProject());
    expect(html).toContain('window.__timelines["sample"]');
    expect(html).toContain("paused: true");
  });

  it("inlines theme tokens scoped to the stage", () => {
    const { html } = compile(sampleProject());
    expect(html).toContain(".df-stage {");
    expect(html).toContain("--df-accent:");
  });

  it("warns when a panel overruns its scene", () => {
    const p = sampleProject();
    p.sequence[0]!.panels[0]!.durationSec = 99;
    const { warnings } = compile(p);
    expect(warnings.some((w) => w.includes("overruns"))).toBe(true);
  });

  it("matches the composition snapshot", () => {
    const { html } = compile(sampleProject());
    expect(html).toMatchSnapshot();
  });
});
