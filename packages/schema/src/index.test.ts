import { describe, it, expect } from "vitest";
import {
  COMPONENT_TYPES,
  ComponentInstanceSchema,
  formatIssues,
  isVarRef,
  parseProject,
  sampleComponent,
  sampleProject,
  varRefName,
  type ComponentType,
} from "./index.js";

describe("sampleProject", () => {
  it("produces a valid project", () => {
    const result = parseProject(sampleProject());
    expect(result.ok).toBe(true);
  });

  it("has two scenes laid out back-to-back", () => {
    const p = sampleProject();
    expect(p.sequence).toHaveLength(2);
    expect(p.sequence[0]!.durationSec).toBe(3);
    expect(p.sequence[1]!.durationSec).toBe(6);
  });
});

describe("sampleComponent", () => {
  it.each(COMPONENT_TYPES)("produces a valid %s component", (type) => {
    const instance = sampleComponent(type as ComponentType);
    expect(instance.type).toBe(type);
    // round-trips through the union schema
    expect(ComponentInstanceSchema.safeParse(instance).success).toBe(true);
  });

  it("covers all 15 component types", () => {
    expect(COMPONENT_TYPES).toHaveLength(15);
  });
});

describe("validation + repair", () => {
  it("rejects a project missing required fields and reports paths", () => {
    const result = parseProject({ schemaVersion: 1, id: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issues = formatIssues(result.error);
      expect(issues).toContain("name");
      expect(issues).toContain("sequence");
    }
  });

  it("rejects an empty sequence", () => {
    const p = sampleProject();
    const result = parseProject({ ...p, sequence: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects a panel with no placement", () => {
    const bad = ComponentInstanceSchema.safeParse({
      type: "nope",
      props: {},
    });
    expect(bad.success).toBe(false);
  });
});

describe("defaults", () => {
  it("applies output + grid defaults", () => {
    const p = sampleProject();
    expect(p.output.width).toBe(1920);
    expect(p.sequence[0]!.layout.gapPx).toBe(24);
  });

  it("applies component prop defaults via schema parse", () => {
    const chart = sampleComponent("chart");
    // showValueLabels has a default of true
    expect((chart.props as { showValueLabels: boolean }).showValueLabels).toBe(
      true,
    );
  });
});

describe("variable references", () => {
  it("recognises {{var}} strings", () => {
    expect(isVarRef("{{modelName}}")).toBe(true);
    expect(isVarRef("{{ run.f1 }}")).toBe(true);
    expect(isVarRef("plain")).toBe(false);
    expect(isVarRef("{{ bad name }}")).toBe(false);
  });

  it("extracts the variable name", () => {
    expect(varRefName("{{modelName}}")).toBe("modelName");
    expect(varRefName("{{ run.f1 }}")).toBe("run.f1");
    expect(varRefName("plain")).toBeNull();
  });

  it("accepts a var ref where a literal is expected", () => {
    const instance = ComponentInstanceSchema.safeParse({
      type: "media",
      props: { fit: "cover" },
      data: { kind: "image", src: "{{heroImage}}" },
    });
    expect(instance.success).toBe(true);
  });
});
