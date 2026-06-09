import { describe, it, expect } from "vitest";
import { collectVarRefs, defaultBindings, resolveVars } from "./variables.js";
import { assertProject, sampleProject } from "@demoforge/schema";

describe("resolveVars", () => {
  it("substitutes whole-string {{var}} references", () => {
    const out = resolveVars(
      { a: "{{x}}", b: ["{{y}}", "literal"], c: 3 },
      { x: 1, y: "Z" },
    );
    expect(out).toEqual({ a: 1, b: ["Z", "literal"], c: 3 });
  });

  it("shows a visible placeholder for unbound references", () => {
    expect(resolveVars("{{missing}}", {})).toBe("[[missing]]");
  });

  it("interpolates inline {{var}} occurrences as text", () => {
    expect(resolveVars("plain {{x}} inline", { x: 1 })).toBe("plain 1 inline");
    expect(resolveVars("no refs here", { x: 1 })).toBe("no refs here");
  });
});

describe("defaultBindings", () => {
  it("reads variable defaults from the project", () => {
    const p = assertProject({
      ...sampleProject(),
      variables: [
        { name: "modelName", type: "string", default: "bert-base" },
        { name: "noDefault", type: "number" },
      ],
    });
    const b = defaultBindings(p);
    expect(b).toEqual({ modelName: "bert-base" });
  });
});

describe("collectVarRefs", () => {
  it("finds every referenced variable name", () => {
    const refs = collectVarRefs({ a: "{{x}}", b: ["{{y}}", { c: "{{x}}" }] });
    expect([...refs].sort()).toEqual(["x", "y"]);
  });
});
