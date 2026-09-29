import {
  bigint,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const userRole = pgEnum("role", ["user", "admin"]);
export const productStockStatus = pgEnum("stockStatus", ["in_stock", "out_of_stock"]);
export const orderStatus = pgEnum("status", ["new", "contacted", "confirmed", "fulfilled", "cancelled"]);

export const users = pgTable(
  "users",
  {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: serial("id").primaryKey(),
    /** Unique identifier for the user (email-based or OAuth). */
    openId: varchar("openId", { length: 128 }).notNull(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    role: userRole("role").default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    openIdUnique: uniqueIndex("users_openId_unique").on(table.openId),
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  promoPrice: decimal("promoPrice", { precision: 10, scale: 2 }),
  currencyCode: varchar("currencyCode", { length: 3 }).notNull().default("USD"),
  stockStatus: productStockStatus("stockStatus").notNull().default("in_stock"),
  isPublished: integer("isPublished").notNull().default(1),
  sizesJson: text("sizesJson").notNull(),
  colorsJson: text("colorsJson").notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});

export type ProductRecord = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const productImages = pgTable(
  "productImages",
  {
    id: serial("id").primaryKey(),
    productId: integer("productId").notNull(),
    url: text("url").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    altText: varchar("altText", { length: 255 }),
    position: integer("position").notNull().default(0),
  },
  table => ({
    productIdx: index("productImages_productId_idx").on(table.productId),
  }),
);

export type ProductImageRecord = typeof productImages.$inferSelect;

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
    customerName: varchar("customerName", { length: 180 }).notNull(),
    customerEmail: varchar("customerEmail", { length: 320 }),
    customerPhone: varchar("customerPhone", { length: 50 }).notNull(),
    customerNote: text("customerNote"),
    status: orderStatus("status").notNull().default("new"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar("currencyCode", { length: 3 }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => ({
    createdAtIdx: index("orders_createdAt_idx").on(table.createdAt),
  }),
);

export type OrderRecord = typeof orders.$inferSelect;

export const orderItems = pgTable(
  "orderItems",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    productId: integer("productId"),
    productTitle: varchar("productTitle", { length: 180 }).notNull(),
    variantLabel: varchar("variantLabel", { length: 255 }).notNull().default("Standard"),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  },
  table => ({
    orderIdx: index("orderItems_orderId_idx").on(table.orderId),
  }),
);

export type OrderItemRecord = typeof orderItems.$inferSelect;
