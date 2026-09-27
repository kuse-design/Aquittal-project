import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { storefrontRouter } from "./routers/storefront";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  system: systemRouter,
  storefront: storefrontRouter,
  admin: adminRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;