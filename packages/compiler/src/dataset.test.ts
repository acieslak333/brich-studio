import { describe, it, expect } from "vitest";
import { inferDatasetFormat, parseDataset } from "./dataset.js";
import { compile, defaultBindings } from "./index.js";
import { assertProject, sampleProject } from "@demoforge/schema";

describe("parseDataset (csv)", () => {
  it("parses headers + coerces numeric/boolean cells", () => {
    const rows = parseDataset("modelName,f1,ok\nbert,0.86,true\nroberta,0.91,false", "csv");
    expect(rows).toEqual([
      { modelName: "bert", f1: 0.86, ok: true },
      { modelName: "roberta", f1: 0.91, ok: false },
    ]);
  });

  it("honors quoted fields with commas", () => {
    const rows = parseDataset('name,note\n"a, b","x ""y"" z"', "csv");
    expect(rows[0]).toEqual({ name: "a, b", note: 'x "y" z' });
  });

  it("ignores blank lines", () => {
    expect(parseDataset("a\n1\n\n2\n", "csv")).toHaveLength(2);
  });
});

describe("parseDataset (json)", () => {
  it("parses an array of row objects", () => {
    const rows = parseDataset('[{"modelName":"bert","f1":0.86}]', "json");
    expect(rows[0]).toEqual({ modelName: "bert", f1: 0.86 });
  });

  it("rejects non-array JSON", () => {
    expect(() => parseDataset('{"a":1}', "json")).toThrow();
  });
});

describe("inferDatasetFormat", () => {
  it("uses the extension", () => {
    expect(inferDatasetFormat("models.json")).toBe("json");
    expect(inferDatasetFormat("models.csv")).toBe("csv");
    expect(inferDatasetFormat("models")).toBe("csv");
  });
});

describe("batch compilation", () => {
  it("produces a distinct, correct composition per row", () => {
    // a project whose title interpolates {{modelName}}
    const base = sampleProject();
    const project = assertProject({
      ...base,
      variables: [{ name: "modelName", type: "string", default: "base" }],
      sequence: [
        {
          ...base.sequence[0]!,
          panels: [
            {
              ...base.sequence[0]!.panels[0]!,
              component: {
                type: "text",
                props: { variant: "title", align: "left", kinetic: true },
                data: { title: "{{modelName}}" },
              },
            },
          ],
        },
        base.sequence[1]!,
      ],
    });

    const rows = parseDataset("modelName\nbert\nroberta", "csv");
    const defaults = defaultBindings(project);
    const htmls = rows.map(
      (row) => compile(project, { bindings: { ...defaults, ...row } }).html,
    );

    expect(htmls[0]).toContain(">bert<");
    expect(htmls[1]).toContain(">roberta<");
    expect(htmls[0]).not.toBe(htmls[1]);
  });
});
