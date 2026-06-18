import { renderBatch } from "./pipeline.js";

/**
 * CLI: render one video per dataset row (§12, M5.1).
 *
 *   pnpm --filter @demoforge/render-server render-batch \
 *     <project.json> <dataset.csv|json> [outDir] [draft|standard|high]
 */
async function main(): Promise<void> {
  const projectPath = process.argv[2];
  const datasetPath = process.argv[3];
  const outDir = process.argv[4];
  const quality = (process.argv[5] ?? "standard") as "draft" | "standard" | "high";
  if (!projectPath || !datasetPath) {
    console.error("usage: render-batch <project.json> <dataset.csv|json> [outDir] [quality]");
    process.exit(1);
  }
  const results = await renderBatch(projectPath, datasetPath, {
    outDir,
    quality,
    onLog: (line) => process.stdout.write(line),
  });
  console.log(`\n✓ rendered ${results.length} videos:`);
  for (const r of results) console.log(`  ${r.key.padEnd(16)} → ${r.mp4Path}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
