import { compileToDisk } from "./pipeline.js";

/**
 * CLI: compile a project.json to a HyperFrames composition on disk.
 *
 *   pnpm --filter @demoforge/render-server compile <project.json> [outDir]
 */
function main(): void {
  const projectPath = process.argv[2];
  const outDir = process.argv[3];
  if (!projectPath) {
    console.error("usage: compile <project.json> [outDir]");
    process.exit(1);
  }
  const r = compileToDisk(projectPath, outDir);
  console.log(`✓ compiled "${r.compositionId}"`);
  console.log(`  html:     ${r.htmlPath}`);
  console.log(`  manifest: ${r.manifestPath}`);
  if (r.warnings.length) {
    console.warn(`  warnings:`);
    for (const w of r.warnings) console.warn(`   - ${w}`);
  }
}

main();
