import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { formatIssues, parseProject, type Project } from "@demoforge/schema";
import { compile } from "@demoforge/compiler";

/**
 * Load → validate → compile → write to disk (§12). The MP4 render step
 * (`@hyperframes/producer`) is a separate seam in `render.ts`; this part is
 * pure and fully offline, so the compile pipeline is testable without the
 * headless-Chrome toolchain.
 */

export interface CompileToDiskResult {
  compositionId: string;
  outDir: string;
  htmlPath: string;
  manifestPath: string;
  warnings: string[];
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
): CompileToDiskResult {
  const project = loadProject(projectPath);
  const result = compile(project);
  const outDir =
    outDirArg ?? resolve(process.cwd(), "projects", project.id, "compiled");
  mkdirSync(outDir, { recursive: true });

  const htmlPath = join(outDir, "composition.html");
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(htmlPath, result.html, "utf8");
  writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2), "utf8");
  if (result.warnings.length) {
    writeFileSync(join(outDir, "warnings.txt"), result.warnings.join("\n"), "utf8");
  }

  return {
    compositionId: result.compositionId,
    outDir,
    htmlPath,
    manifestPath,
    warnings: result.warnings,
  };
}
