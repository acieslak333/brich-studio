import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { compileToDisk, renderProject } from "./pipeline.js";

/**
 * Minimal render service (§12). Exposes a health check and a `/render` endpoint
 * that compiles a project to a composition on disk. The actual MP4 encode
 * (`renderToMp4` in render.ts) and SSE progress streaming are the next wiring
 * step once `@hyperframes/producer` is installed.
 *
 * Kept on `node:http` (zero deps) for now; swap to Fastify/Express when the
 * endpoint surface grows (batch render, website import, SSE).
 */

const PORT = Number(process.env.PORT ?? 4317);

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true, service: "demoforge-render-server" });
    }

    // POST /compile { projectPath, outDir? } — compile only (no MP4 encode)
    if (req.method === "POST" && req.url === "/compile") {
      const body = await readBody(req);
      const { projectPath, outDir } = JSON.parse(body || "{}") as {
        projectPath?: string;
        outDir?: string;
      };
      if (!projectPath) return json(res, 400, { error: "projectPath is required" });
      return json(res, 200, { ok: true, ...compileToDisk(projectPath, outDir) });
    }

    // POST /render { projectPath, outDir?, quality?, fps?, format? } — compile + MP4
    if (req.method === "POST" && req.url === "/render") {
      const body = await readBody(req);
      const opts = JSON.parse(body || "{}") as {
        projectPath?: string;
        outDir?: string;
        quality?: "draft" | "standard" | "high";
        fps?: 24 | 30 | 60;
        format?: "mp4" | "webm";
      };
      if (!opts.projectPath) return json(res, 400, { error: "projectPath is required" });
      const result = await renderProject(opts.projectPath, opts);
      return json(res, 200, { ok: true, ...result });
    }

    return json(res, 404, {
      error: "not found",
      routes: ["/health", "POST /compile", "POST /render"],
    });
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`demoforge render-server listening on http://localhost:${PORT}`);
});
