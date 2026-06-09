import { describe, it, expect } from "vitest";
import { parseProject } from "@demoforge/schema";
import { compile } from "./compile.js";
import demo from "../../../examples/results-demo.json";

/**
 * M1 DoD: a hand-written 2-scene example validates and compiles with correct
 * timing (no LLM, no UI). The MP4 render itself is wired in the render-server
 * milestone once `@hyperframes/producer` is installed.
 */
describe("examples/results-demo.json", () => {
  it("validates against the schema", () => {
    const result = parseProject(demo);
    expect(result.ok).toBe(true);
  });

  it("compiles deterministically with resolved variables", () => {
    const result = parseProject(demo);
    if (!result.ok) throw result.error;
    const a = compile(result.project);
    const b = compile(result.project);
    expect(a.html).toBe(b.html);
    // {{modelName}} resolved from its default
    expect(a.html).toContain("bert-base-v2 Results");
    expect(a.html).not.toContain("{{modelName}}");
    // four panels in the results scene
    expect(a.html).toContain('id="df-panel-chart"');
    expect(a.html).toContain('id="df-panel-term"');
  });

  it("lays the two scenes back-to-back (total 10s)", () => {
    const result = parseProject(demo);
    if (!result.ok) throw result.error;
    const { html, durationSec } = compile(result.project);
    expect(durationSec).toBe(10);
    // root duration is the sum of scene durations (3 + 7)
    expect(html).toMatch(/df-stage[^>]*data-start="0"[^>]*data-duration="10"/s);
    // scene-1 gradient background clip at 0..3; scene-2 chart panel starts at 3
    expect(html).toMatch(/df-bg-s-title[^>]*data-start="0"[^>]*data-duration="3"/s);
    expect(html).toMatch(/df-panel-chart[^>]*data-start="3"/s);
  });
});
