import { renderProject } from "./pipeline.js";

/**
 * CLI: compile a project.json AND render it to MP4 via HyperFrames.
 *
 *   pnpm --filter @demoforge/render-server render <project.json> [outDir] [quality]
 */
async function main(): Promise<void> {
  const projectPath = process.argv[2];
  const outDir = process.argv[3];
  const quality = (process.argv[4] ?? "standard") as "draft" | "standard" | "high";
  if (!projectPath) {
    console.error("usage: render <project.json> [outDir] [draft|standard|high]");
    process.exit(1);
  }
  const r = await renderProject(projectPath, {
    outDir,
    quality,
    onLog: (line) => process.stdout.write(line),
  });
  console.log(`\n✓ rendered "${r.compositionId}" (${r.durationSec}s)`);
  console.log(`  mp4: ${r.mp4Path}`);
  if (r.warnings.length) {
    console.warn(`  warnings:`);
    for (const w of r.warnings) console.warn(`   - ${w}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
