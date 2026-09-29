import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { hashPassword, verifyPassword, createSessionToken, getSessionCookieOptions } from "../_core/auth";
import type { User } from "../../shared/types";
import * as db from "../db";

const loginInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const registerInput = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(180).optional(),
});

/** Only these fields ever leave the server. Never return `passwordHash`. */
function toSafeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user ? toSafeUser(ctx.user) : null;
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie("app_session_id", sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });

    return { user: toSafeUser(user) };
  }),

  register: publicProcedure.input(registerInput).mutation(async ({ input, ctx }) => {
    const existing = await db.getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
    }

    const passwordHash = await hashPassword(input.password);

    await db.upsertUser({
      openId: `email_${input.email}`,
      email: input.email,
      name: input.name ?? null,
      passwordHash,
      loginMethod: "email",
      role: "user",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByEmail(input.email);
    if (!user) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
    }

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie("app_session_id", sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });

    return { user: toSafeUser(user) };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie("app_session_id", { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});