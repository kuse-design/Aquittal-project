import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";

const secretKey = new TextEncoder().encode(ENV.jwtSecret);

export type SessionPayload = {
  userId: number;
  email: string;
  role: string;
};

// Pure-JS bcrypt: avoids a native build step, which is unreliable on
// serverless/container build images. Cost 12 keeps existing hashes valid.
const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;

  try {
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { userId, email, role } = payload as {
      userId: unknown;
      email: unknown;
      role: unknown;
    };

    if (
      typeof userId !== "number" ||
      typeof email !== "string" ||
      !email ||
      typeof role !== "string"
    ) {
      return null;
    }

    return { userId, email, role };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function authenticateRequest(req: Request): Promise<SessionPayload | null> {
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }

  return verifySession(sessionToken);
}

export async function getUserFromSession(session: SessionPayload) {
  const user = await db.getUserById(session.userId);
  return user;
}

export function getSessionCookieOptions(req: Request) {
  const isSecure = req.protocol === "https" ||
    req.headers["x-forwarded-proto"]?.toString().includes("https");

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecure,
  };
}