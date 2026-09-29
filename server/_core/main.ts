import "dotenv/config";
import { createApp, createServer, listen } from "./app";
import { serveStatic } from "./static";

/**
 * Production entry point. Bundled to `dist-server/main.js` by `pnpm build`
 * and run by Render. Deliberately free of any `vite` import so the bundle
 * only depends on runtime dependencies.
 */
async function main() {
  const app = createApp();
  const server = createServer(app);
  serveStatic(app);
  await listen(server);
}

main().catch(console.error);
