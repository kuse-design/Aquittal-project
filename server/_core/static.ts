import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serves the built client from `dist/public` with an SPA fallback.
 *
 * The project root is resolved from the working directory (not from
 * `import.meta.dirname`) because this module is bundled into `dist-server/`,
 * which sits one directory deeper than the sources.
 */
function getDistPath(): string {
  const fromCwd = path.resolve(process.cwd(), "dist", "public");
  if (fs.existsSync(fromCwd)) return fromCwd;

  // Fall back to walking up from this module for unusual working directories.
  return path.resolve(import.meta.dirname, "..", "..", "dist", "public");
}

export function serveStatic(app: Express) {
  const distPath = getDistPath();

  if (!fs.existsSync(distPath)) {
    console.error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  app.use(express.static(distPath));

  // fall through to index.html for client-side routes
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found");
    }
  });
}
