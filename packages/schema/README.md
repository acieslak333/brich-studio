# @demoforge/schema

Zod schemas + inferred TypeScript types for the DemoForge project model (§5 of
the build prompt). This is the **single source of truth** shared by the editor,
compiler, render server, and LLM agent.

## Why Zod-first

Types are *inferred* from the schemas, so `project.json` on disk, the editor
state, and the compiler input all validate against the exact same shapes. LLM
output is untrusted (§9/§13): it is parsed here, and the validation errors feed
the planner's validate→repair loop via `formatIssues`.

## Shape

```
Project
├─ output: OutputSettings        (resolution / fps / format / aspect)
├─ variables?: VariableDef[]      ({{var}} bindings for batch render)
└─ sequence: Scene[]
   └─ Scene
      ├─ layout: GridLayout       (CSS grid)
      └─ panels: Panel[]
         └─ Panel
            ├─ timing             (startSec / durationSec, relative to scene)
            ├─ enter / exit       (AnimationPreset)
            └─ component: ComponentInstance   (discriminated union, 15 types)
```

`ComponentInstance` is a discriminated union over `ComponentType` so every block
has fully-typed `props` + `data`. Tier-1 (chart, table, comparison, media,
code-diff, terminal, text) and Tier-2 (audio, llm-chat, nlp, detection,
api-flow, diagram, graph, math) are all covered.

## Key exports

| Export | Purpose |
| --- | --- |
| `ProjectSchema`, `Project` | Top-level schema + type |
| `parseProject(input)` | Safe parse → `{ ok, project }` or `{ ok, error }` |
| `assertProject(input)` | Throwing parse |
| `formatIssues(error)` | Compact `path: message` list for LLM repair |
| `sampleProject()` | A valid two-scene project (examples/tests) |
| `sampleComponent(type)` | Zero-data sample for any block (§7c) |
| `withVarRef`, `isVarRef`, `varRefName` | `{{variable}}` reference helpers |

## Variable references

Any literal prop/data value may instead be a `"{{name}}"` string. The compiler
and batch renderer substitute these from project `variables` or a dataset row,
mapping onto HyperFrames' own `variables` / `--variables` / `render-batch`.
