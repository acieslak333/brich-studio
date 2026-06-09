/**
 * The MP4 render seam (§12). Compiling a project produces a HyperFrames
 * composition (HTML); turning that into an MP4 is `@hyperframes/producer`'s job
 * (headless Chrome seeks frames → FFmpeg encodes).
 *
 * This is intentionally a thin, clearly-marked seam: it dynamically loads the
 * producer so the rest of the server runs fully offline, and fails with an
 * actionable message until the HyperFrames toolchain is wired (M0 DoD).
 */

export interface RenderToMp4Args {
  htmlPath: string;
  outPath: string;
  width: number;
  height: number;
  fps: number;
}

export async function renderToMp4(_args: RenderToMp4Args): Promise<string> {
  let producer: unknown;
  try {
    // @ts-expect-error — optional peer; not installed until M0 render wiring.
    producer = await import("@hyperframes/producer");
  } catch {
    throw new Error(
      [
        "MP4 render is not wired yet.",
        "Next step (M0 DoD): install the HyperFrames toolchain and implement this seam:",
        "  pnpm add -w @hyperframes/producer @hyperframes/engine @hyperframes/core",
        "  npx skills add heygen-com/hyperframes   # read the production patterns",
        "Then run `hyperframes lint` on the composition and call the producer's",
        "capture+encode pipeline with the compiled composition.html.",
      ].join("\n"),
    );
  }
  // Once the producer API is confirmed against the installed package, drive it
  // here with _args (capture frames → encode → audio mix → write outPath).
  void producer;
  throw new Error("renderToMp4: producer detected but pipeline not implemented yet.");
}
