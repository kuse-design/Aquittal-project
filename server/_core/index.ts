import "dotenv/config";
import { createApp, createServer, listen } from "./app";
import { setupVite } from "./dev";

/**
 * Development entry point (`pnpm dev`).
 *
 * Bundles the Vite dev server for HMR. The production equivalent is
 * `server/_core/main.ts`, which is what Render runs.
 */
async function main() {
  const app = createApp();
  const server = createServer(app);
  await setupVite(app, server);
  await listen(server);
}

main().catch(console.error);
