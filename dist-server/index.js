// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  console.log("[Notification] Owner notification:", { title, content });
  return true;
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/admin.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { nanoid as nanoid2 } from "nanoid";
import { z as z2 } from "zod";

// server/storage.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// server/_core/env.ts
var ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI-compatible API (OpenAI, Azure, local, etc.)
  forgeApiUrl: process.env.OPENAI_API_URL ?? "",
  forgeApiKey: process.env.OPENAI_API_KEY ?? "",
  // S3-compatible storage (R2, MinIO, AWS S3, etc.)
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3PublicUrl: process.env.S3_PUBLIC_URL ?? ""
};

// server/storage.ts
function getS3Config() {
  const endpoint = ENV.s3Endpoint;
  const region = ENV.s3Region;
  const accessKeyId = ENV.s3AccessKeyId;
  const secretAccessKey = ENV.s3SecretAccessKey;
  const bucket = ENV.s3Bucket;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Storage config missing: set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET"
    );
  }
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}
function getS3Client() {
  const { endpoint, region, accessKeyId, secretAccessKey } = getS3Config();
  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
}
function getPublicUrl(key) {
  const { bucket } = getS3Config();
  const publicUrl = ENV.s3PublicUrl;
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `/api/storage/${key}`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { bucket } = getS3Config();
  const key = appendHashSuffix(normalizeKey(relKey));
  const client = getS3Client();
  const blob = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: blob,
      ContentType: contentType
    })
  );
  return { key, url: getPublicUrl(key) };
}

// server/store.db.ts
import { desc, eq as eq2, inArray } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";

// drizzle/schema.ts
import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Unique identifier for the user (email-based or OAuth). */
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  promoPrice: decimal("promoPrice", { precision: 10, scale: 2 }),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull().default("USD"),
  stockStatus: mysqlEnum("stockStatus", ["in_stock", "out_of_stock"]).notNull().default("in_stock"),
  isPublished: int("isPublished").notNull().default(1),
  sizesJson: text("sizesJson").notNull(),
  colorsJson: text("colorsJson").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull()
});
var productImages = mysqlTable("productImages", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  altText: varchar("altText", { length: 255 }),
  position: int("position").notNull().default(0)
});
var orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
  customerName: varchar("customerName", { length: 180 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 50 }).notNull(),
  customerNote: text("customerNote"),
  status: mysqlEnum("status", ["new", "contacted", "confirmed", "fulfilled", "cancelled"]).notNull().default("new"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull()
});
var orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  productTitle: varchar("productTitle", { length: 180 }).notNull(),
  variantLabel: varchar("variantLabel", { length: 255 }).notNull().default("Standard"),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull()
});

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId ?? `email_${user.email}`
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/store.db.ts
function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "The store database is unavailable." });
    return db;
  });
}
function readStringList(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
function normalizedPrice(value) {
  const [whole, fraction = ""] = value.trim().split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}
function priceToMinor(value) {
  const [whole, fraction = "00"] = normalizedPrice(value).split(".");
  return Number(whole) * 100 + Number(fraction.slice(0, 2));
}
function minorToPrice(value) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
function productSlug(title) {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160) || "piece";
  return `${base}-${nanoid(6).toLowerCase()}`;
}
async function imagesByProductIds(ids) {
  if (ids.length === 0) return [];
  const db = await requireDb();
  return db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(productImages.position, productImages.id);
}
function mapProduct(row, imageRows) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    category: row.category ?? "Clothing",
    price: String(row.price),
    promoPrice: row.promoPrice === null ? null : String(row.promoPrice),
    currencyCode: row.currencyCode,
    stockStatus: row.stockStatus,
    isPublished: row.isPublished === 1,
    sizes: readStringList(row.sizesJson),
    colors: readStringList(row.colorsJson),
    images: imageRows.filter((image) => image.productId === row.id).map((image) => ({
      id: image.id,
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText,
      position: image.position
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
async function listStoreProducts(includeUnpublished = false) {
  const db = await requireDb();
  const rows = includeUnpublished ? await db.select().from(products).orderBy(desc(products.createdAt)) : await db.select().from(products).where(eq2(products.isPublished, 1)).orderBy(desc(products.createdAt));
  const imageRows = await imagesByProductIds(rows.map((row) => row.id));
  return rows.map((row) => mapProduct(row, imageRows));
}
async function getStoreProduct(id) {
  const db = await requireDb();
  const [row] = await db.select().from(products).where(eq2(products.id, id)).limit(1);
  if (!row) return null;
  const imageRows = await imagesByProductIds([id]);
  return mapProduct(row, imageRows);
}
function productValues(input) {
  if (input.promoPrice && priceToMinor(input.promoPrice) >= priceToMinor(input.price)) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Promo price must be lower than the regular price." });
  }
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    category: input.category.trim() || "Clothing",
    price: normalizedPrice(input.price),
    promoPrice: input.promoPrice ? normalizedPrice(input.promoPrice) : null,
    currencyCode: input.currencyCode.toUpperCase(),
    stockStatus: input.stockStatus,
    isPublished: input.isPublished ? 1 : 0,
    sizesJson: JSON.stringify(input.sizes.map((value) => value.trim()).filter(Boolean)),
    colorsJson: JSON.stringify(input.colors.map((value) => value.trim()).filter(Boolean))
  };
}
async function saveImages(productId, input) {
  if (input.images.length === 0) return;
  const db = await requireDb();
  await db.insert(productImages).values(
    input.images.map((image, position) => ({
      productId,
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText?.trim() || null,
      position: image.position ?? position
    }))
  );
}
async function createStoreProduct(input) {
  const db = await requireDb();
  const slug = productSlug(input.title);
  const now = Date.now();
  await db.insert(products).values({ ...productValues(input), slug, createdAt: now, updatedAt: now });
  const [row] = await db.select().from(products).where(eq2(products.slug, slug)).limit(1);
  if (!row) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "The product could not be loaded after saving." });
  await saveImages(row.id, input);
  return await getStoreProduct(row.id);
}
async function updateStoreProduct(id, input) {
  const db = await requireDb();
  const [existing] = await db.select({ id: products.id }).from(products).where(eq2(products.id, id)).limit(1);
  if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "That product no longer exists." });
  await db.update(products).set({ ...productValues(input), updatedAt: Date.now() }).where(eq2(products.id, id));
  await db.delete(productImages).where(eq2(productImages.productId, id));
  await saveImages(id, input);
  return await getStoreProduct(id);
}
async function deleteStoreProduct(id) {
  const db = await requireDb();
  await db.delete(productImages).where(eq2(productImages.productId, id));
  await db.delete(products).where(eq2(products.id, id));
  return { success: true };
}
async function submitStoreOrder(input) {
  const db = await requireDb();
  const ids = Array.from(new Set(input.lines.map((line) => line.productId)));
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const productById = new Map(rows.map((row) => [row.id, row]));
  if (productById.size !== ids.length) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "One or more items are no longer available. Please refresh your bag." });
  }
  const currencies = new Set(rows.map((row) => row.currencyCode));
  if (currencies.size !== 1) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "Items in one order must use the same currency." });
  }
  const currencyCode = Array.from(currencies)[0];
  let totalMinor = 0;
  const orderLines = input.lines.map((line) => {
    const product = productById.get(line.productId);
    if (product.isPublished !== 1 || product.stockStatus !== "in_stock") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `${product.title} is not currently available.` });
    }
    const sizes = readStringList(product.sizesJson);
    const colors = readStringList(product.colorsJson);
    if (line.size && sizes.length && !sizes.includes(line.size)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `Please choose an available size for ${product.title}.` });
    }
    if (line.color && colors.length && !colors.includes(line.color)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: `Please choose an available colour for ${product.title}.` });
    }
    const unitMinor = priceToMinor(product.promoPrice ?? String(product.price));
    const lineTotalMinor = unitMinor * line.quantity;
    totalMinor += lineTotalMinor;
    const variantLabel = [line.size ? `Size ${line.size}` : "", line.color ?? ""].filter(Boolean).join(" \xB7 ") || "Standard";
    return {
      productId: product.id,
      productTitle: product.title,
      variantLabel,
      unitPrice: minorToPrice(unitMinor),
      quantity: line.quantity,
      lineTotal: minorToPrice(lineTotalMinor)
    };
  });
  const now = Date.now();
  const orderNumber = `ORD-${new Date(now).toISOString().slice(0, 10).replace(/-/g, "")}-${nanoid(5).toUpperCase()}`;
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      orderNumber,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      customerPhone: input.customerPhone.trim(),
      customerNote: input.customerNote?.trim() || null,
      status: "new",
      total: minorToPrice(totalMinor),
      currencyCode,
      createdAt: now,
      updatedAt: now
    });
    const [savedOrder] = await tx.select({ id: orders.id }).from(orders).where(eq2(orders.orderNumber, orderNumber)).limit(1);
    if (!savedOrder) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "The order could not be confirmed." });
    await tx.insert(orderItems).values(orderLines.map((line) => ({ ...line, orderId: savedOrder.id })));
  });
  return { orderNumber, total: minorToPrice(totalMinor), currencyCode, createdAt: now };
}
async function listStoreOrders() {
  const db = await requireDb();
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  if (orderRows.length === 0) return [];
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderRows.map((order) => order.id)));
  return orderRows.map((order) => ({
    ...order,
    total: String(order.total),
    status: order.status,
    items: itemRows.filter((item) => item.orderId === order.id).map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle,
      variantLabel: item.variantLabel,
      unitPrice: String(item.unitPrice),
      quantity: item.quantity,
      lineTotal: String(item.lineTotal)
    }))
  }));
}
async function setStoreOrderStatus(id, status) {
  const db = await requireDb();
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq2(orders.id, id)).limit(1);
  if (!existing) throw new TRPCError3({ code: "NOT_FOUND", message: "That order could not be found." });
  await db.update(orders).set({ status, updatedAt: Date.now() }).where(eq2(orders.id, id));
  return { success: true };
}
function publicProduct(product) {
  const { slug: _slug, isPublished: _isPublished, ...visible } = product;
  return visible;
}

// server/routers/admin.ts
var moneyInput = z2.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a price with up to two decimal places.").refine((value) => Number(value) > 0, "Price must be greater than zero.");
var productInput = z2.object({
  title: z2.string().trim().min(2).max(180),
  description: z2.string().max(5e3),
  category: z2.string().trim().max(100),
  price: moneyInput,
  promoPrice: moneyInput.nullable(),
  currencyCode: z2.string().trim().regex(/^[A-Za-z]{3}$/),
  stockStatus: z2.enum(["in_stock", "out_of_stock"]),
  isPublished: z2.boolean(),
  sizes: z2.array(z2.string().trim().min(1).max(40)).max(15),
  colors: z2.array(z2.string().trim().min(1).max(40)).max(15),
  images: z2.array(
    z2.object({
      url: z2.string().min(1).max(1024),
      storageKey: z2.string().min(1).max(512),
      altText: z2.string().max(255).nullable(),
      position: z2.number().int().min(0).max(20)
    })
  ).max(8)
}).superRefine((value, context) => {
  if (value.promoPrice !== null) {
    const regular = Math.round(Number(value.price) * 100);
    const promo = Math.round(Number(value.promoPrice) * 100);
    if (promo >= regular) {
      context.addIssue({ code: "custom", path: ["promoPrice"], message: "Promo price must be lower than regular price." });
    }
  }
});
var uploadInput = z2.object({
  fileName: z2.string().trim().min(1).max(160),
  contentType: z2.enum(["image/jpeg", "image/png", "image/webp"]),
  contentBase64: z2.string().min(1).max(7e6)
});
function hasValidImageSignature(data, contentType) {
  if (contentType === "image/jpeg") return data.length > 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (contentType === "image/png") return data.length > 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
}
var adminRouter = router({
  products: router({
    list: adminProcedure.query(() => listStoreProducts(true)),
    create: adminProcedure.input(productInput).mutation(({ input }) => createStoreProduct(input)),
    update: adminProcedure.input(z2.object({ id: z2.number().int().positive(), product: productInput })).mutation(({ input }) => updateStoreProduct(input.id, input.product)),
    delete: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteStoreProduct(input.id))
  }),
  orders: router({
    list: adminProcedure.query(() => listStoreOrders()),
    updateStatus: adminProcedure.input(z2.object({ id: z2.number().int().positive(), status: z2.enum(["new", "contacted", "confirmed", "fulfilled", "cancelled"]) })).mutation(({ input }) => setStoreOrderStatus(input.id, input.status))
  }),
  uploadImage: adminProcedure.input(uploadInput).mutation(async ({ input }) => {
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[input.contentType];
    const data = Buffer.from(input.contentBase64, "base64");
    if (data.length === 0 || data.length > 5 * 1024 * 1024 || !hasValidImageSignature(data, input.contentType)) {
      throw new TRPCError4({ code: "BAD_REQUEST", message: "Upload a valid JPEG, PNG, or WebP image up to 5 MB." });
    }
    const stored = await storagePut(`store-products/${nanoid2(16)}.${extension}`, data, input.contentType);
    return { url: stored.url, storageKey: stored.key, altText: input.fileName.replace(/\.[^.]+$/, "").slice(0, 255) };
  })
});

// server/routers/storefront.ts
import { z as z3 } from "zod";
var orderLineSchema = z3.object({
  productId: z3.number().int().positive(),
  quantity: z3.number().int().min(1).max(50),
  size: z3.string().trim().max(40).optional(),
  color: z3.string().trim().max(40).optional()
});
var storefrontRouter = router({
  products: router({
    list: publicProcedure.query(async () => {
      const products2 = await listStoreProducts(false);
      return products2.map(publicProduct);
    })
  }),
  orders: router({
    submit: publicProcedure.input(
      z3.object({
        customerName: z3.string().trim().min(2).max(180),
        customerEmail: z3.union([z3.string().trim().email().max(320), z3.literal("")]).optional(),
        customerPhone: z3.string().trim().min(6).max(50),
        customerNote: z3.string().trim().max(2e3).optional(),
        lines: z3.array(orderLineSchema).min(1).max(50)
      })
    ).mutation(({ input }) => submitStoreOrder(input))
  })
});

// server/routers/auth.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z4 } from "zod";

// server/_core/auth.ts
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
var secretKey = new TextEncoder().encode(ENV.jwtSecret);
async function hashPassword(password) {
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(password, 12);
}
async function verifyPassword(password, hash) {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(password, hash);
}
async function createSessionToken(payload, options = {}) {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
}
async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"]
    });
    const { userId, email, role } = payload;
    if (typeof userId !== "number" || typeof email !== "string" || !email || typeof role !== "string") {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}
function parseCookies(cookieHeader) {
  if (!cookieHeader) return /* @__PURE__ */ new Map();
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}
async function authenticateRequest(req) {
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
async function getUserFromSession(session) {
  const user = await getUserById(session.userId);
  return user;
}
function getSessionCookieOptions(req) {
  const isSecure = req.protocol === "https" || req.headers["x-forwarded-proto"]?.toString().includes("https");
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecure
  };
}

// server/routers/auth.ts
var loginInput = z4.object({
  email: z4.string().trim().email().max(320),
  password: z4.string().min(8).max(128)
});
var registerInput = z4.object({
  email: z4.string().trim().email().max(320),
  password: z4.string().min(8).max(128),
  name: z4.string().trim().min(2).max(180).optional()
});
var authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
  login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError5({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError5({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie("app_session_id", sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1e3 });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }),
  register: publicProcedure.input(registerInput).mutation(async ({ input, ctx }) => {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError5({ code: "CONFLICT", message: "Email already registered" });
    }
    const passwordHash = await hashPassword(input.password);
    await upsertUser({
      openId: `email_${input.email}`,
      email: input.email,
      name: input.name ?? null,
      passwordHash,
      loginMethod: "email",
      role: "user",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const user = await getUserByEmail(input.email);
    if (!user) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
    }
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie("app_session_id", sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1e3 });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie("app_session_id", { ...cookieOptions, maxAge: -1 });
    return { success: true };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  storefront: storefrontRouter,
  admin: adminRouter,
  auth: authRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    const session = await authenticateRequest(opts.req);
    if (session) {
      const dbUser = await getUserFromSession(session);
      user = dbUser ?? null;
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid3 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid3()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const isVercel = !!process.env.VERCEL;
  const projectRoot = path2.resolve(import.meta.dirname, "..", "..");
  if (!isVercel) {
    const distPath = path2.resolve(projectRoot, "dist", "public");
    if (!fs.existsSync(distPath)) {
      console.error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`
      );
    }
    app.use(express.static(distPath));
  }
  app.use("*", (_req, res) => {
    const indexPath = path2.resolve(projectRoot, "dist", "public", "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found");
    }
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
function createApp() {
  const app = express2();
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  return app;
}
async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
var index_default = createApp();
export {
  createApp,
  index_default as default
};
