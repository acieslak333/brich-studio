import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createRequire } from "node:module";
import { formatIssues, parseProject, type Project } from "@demoforge/schema";
import {
  compile,
  defaultBindings,
  inferDatasetFormat,
  parseDataset,
  type Bindings,
} from "@demoforge/compiler";
import { renderToMp4, type RenderToMp4Args } from "./render.js";

const require = createRequire(import.meta.url);

/** Copy the locally-installed GSAP build next to index.html (offline render). */
function vendorGsap(outDir: string): void {
  const gsapPkg = require.resolve("gsap/package.json");
  copyFileSync(join(dirname(gsapPkg), "dist", "gsap.min.js"), join(outDir, "gsap.min.js"));
}

/**
 * Load → validate → compile → write to disk (§12). The MP4 render step
 * (`@hyperframes/producer`) is a separate seam in `render.ts`; this part is
 * pure and fully offline, so the compile pipeline is testable without the
 * headless-Chrome toolchain.
 */

export interface CompileToDiskResult {
  compositionId: string;
  outDir: string;
  /** Render-ready HyperFrames entry point (index.html). */
  htmlPath: string;
  manifestPath: string;
  warnings: string[];
  durationSec: number;
}

/** Read + validate a `project.json`, throwing a readable error if invalid. */
export function loadProject(path: string): Project {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const result = parseProject(raw);
  if (!result.ok) {
    throw new Error(`Invalid project (${path}):\n${formatIssues(result.error)}`);
  }
  return result.project;
}

export function compileToDisk(
  projectPath: string,
  outDirArg?: string,
  bindings?: Bindings,
): CompileToDiskResult {
  return writeProjectDir(loadProject(projectPath), outDirArg, bindings);
}

/** Compile an already-loaded project to a render-ready dir (with bindings). */
export function writeProjectDir(
  project: Project,
  outDirArg?: string,
  bindings?: Bindings,
): CompileToDiskResult {
  const result = compile(project, bindings ? { bindings } : {});
  const outDir =
    outDirArg ?? resolve(process.cwd(), "projects", project.id, "compiled");
  mkdirSync(outDir, { recursive: true });

  // Emit a render-ready HyperFrames project: index.html is the entry point the
  // `hyperframes` CLI / producer renders.
  const htmlPath = join(outDir, "index.html");
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(htmlPath, result.html, "utf8");
  vendorGsap(outDir);
  writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2), "utf8");
  writeFileSync(
    join(outDir, "meta.json"),
    JSON.stringify({ id: project.id, name: project.name }, null, 2),
    "utf8",
  );
  writeFileSync(
    join(outDir, "hyperframes.json"),
    JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        paths: { blocks: "compositions", assets: "assets" },
      },
      null,
      2,
    ),
    "utf8",
  );
  if (result.warnings.length) {
    writeFileSync(join(outDir, "warnings.txt"), result.warnings.join("\n"), "utf8");
  }

  return {
    compositionId: result.compositionId,
    outDir,
    htmlPath,
    manifestPath,
    warnings: result.warnings,
    durationSec: result.durationSec,
  };
}

export interface RenderProjectResult extends CompileToDiskResult {
  mp4Path: string;
}

/** Compile a project, then render it to an MP4/WebM via the HyperFrames CLI. */
export async function renderProject(
  projectPath: string,
  opts: {
    outDir?: string;
    outPath?: string;
    quality?: RenderToMp4Args["quality"];
    fps?: RenderToMp4Args["fps"];
    format?: RenderToMp4Args["format"];
    bindings?: Bindings;
    onLog?: (line: string) => void;
  } = {},
): Promise<RenderProjectResult> {
  const compiled = compileToDisk(projectPath, opts.outDir, opts.bindings);
  const outPath =
    opts.outPath ?? join(compiled.outDir, `${compiled.compositionId}.${opts.format ?? "mp4"}`);
  const mp4Path = await renderToMp4({
    projectDir: compiled.outDir,
    outPath,
    quality: opts.quality,
    fps: opts.fps,
    format: opts.format,
    onLog: opts.onLog,
  });
  return { ...compiled, mp4Path };
}

export interface BatchRowResult {
  index: number;
  key: string;
  bindings: Bindings;
  outDir: string;
  mp4Path: string;
  warnings: string[];
}

/** Filesystem-safe slug for a row key. */
function slug(value: unknown, fallback: string): string {
  const s = String(value ?? "").trim();
  const cleaned = s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.length ? cleaned : fallback;
}

/**
 * Batch render (§12, M5.1): one template + a CSV/JSON dataset → one video per
 * row. Each row's fields override the project's variable defaults, mapping onto
 * the same `{{var}}` resolution the single render uses.
 */
export async function renderBatch(
  projectPath: string,
  datasetPath: string,
  opts: {
    outDir?: string;
    quality?: RenderToMp4Args["quality"];
    fps?: RenderToMp4Args["fps"];
    format?: RenderToMp4Args["format"];
    /** Row field used to name each output dir (default "modelName" then "id"). */
    keyField?: string;
    onLog?: (line: string) => void;
  } = {},
): Promise<BatchRowResult[]> {
  const project = loadProject(projectPath);
  const defaults = defaultBindings(project);
  const rows = parseDataset(readFileSync(datasetPath, "utf8"), inferDatasetFormat(datasetPath));
  if (rows.length === 0) throw new Error(`dataset is empty: ${datasetPath}`);

  const baseOutDir =
    opts.outDir ?? resolve(process.cwd(), "projects", project.id, "batch");
  const format = opts.format ?? "mp4";
  const keyField = opts.keyField ?? (rows[0]!.modelName !== undefined ? "modelName" : "id");

  const results: BatchRowResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const bindings: Bindings = { ...defaults, ...row };
    const key = slug(row[keyField], `row-${i}`);
    const rowDir = join(baseOutDir, key);
    const compiled = writeProjectDir(project, rowDir, bindings);
    const outPath = join(rowDir, `${slug(project.id, "video")}-${key}.${format}`);
    opts.onLog?.(`\n[batch ${i + 1}/${rows.length}] ${key}\n`);
    const mp4Path = await renderToMp4({
      projectDir: rowDir,
      outPath,
      quality: opts.quality,
      fps: opts.fps,
      format: opts.format,
      onLog: opts.onLog,
    });
    results.push({ index: i, key, bindings, outDir: rowDir, mp4Path, warnings: compiled.warnings });
  }
  return results;
}
