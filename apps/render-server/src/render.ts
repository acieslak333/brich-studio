import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * MP4 render (§12). A compiled project dir (index.html + gsap.min.js + assets)
 * is rendered by the HyperFrames toolchain: headless Chrome seeks frames →
 * FFmpeg encodes. We drive the official `hyperframes` CLI (which uses
 * `@hyperframes/producer` internally) — the documented, reproducible path —
 * rather than coupling to the producer's programmatic surface.
 *
 * `--strict` makes the CLI fail on lint errors, satisfying the
 * "lint/inspect before render" requirement (§12).
 */

const require = createRequire(import.meta.url);

export interface RenderToMp4Args {
  /** Directory containing the compiled index.html (and gsap.min.js). */
  projectDir: string;
  /** Absolute output path for the rendered file. */
  outPath: string;
  quality?: "draft" | "standard" | "high";
  fps?: 24 | 30 | 60;
  format?: "mp4" | "webm";
  /** Receives stdout/stderr lines from the renderer (for SSE/progress). */
  onLog?: (line: string) => void;
}

/** Render a compiled project directory to an MP4/WebM. Resolves to `outPath`. */
export async function renderToMp4(args: RenderToMp4Args): Promise<string> {
  const cli = resolveHyperframesCli();
  const argv = [
    cli,
    "render",
    "--output",
    args.outPath,
    "--quality",
    args.quality ?? "standard",
    "--strict",
  ];
  if (args.fps) argv.push("--fps", String(args.fps));
  if (args.format && args.format !== "mp4") argv.push("--format", args.format);

  await runNode(argv, args.projectDir, args.onLog);
  return args.outPath;
}

/** Path to the installed `hyperframes` CLI entry (`dist/cli.js`). */
function resolveHyperframesCli(): string {
  const pkgJson = require.resolve("hyperframes/package.json");
  return join(dirname(pkgJson), "dist", "cli.js");
}

function runNode(
  argv: string[],
  cwd: string,
  onLog?: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const pipe = (buf: Buffer): void => {
      const text = buf.toString();
      if (onLog) onLog(text);
    };
    child.stdout.on("data", pipe);
    child.stderr.on("data", pipe);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`hyperframes render exited with code ${code}`));
    });
  });
}
