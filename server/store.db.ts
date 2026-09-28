import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { orderItems, orders, productImages, products } from "../drizzle/schema";
import type {
  OrderStatus,
  ProductInput,
  PublicStoreProduct,
  StoreOrder,
  StoreProduct,
} from "../shared/store";
import { getDb } from "./db";
// @ts-ignore - email module depends on nodemailer which may not be installed yet
import { sendEmail, generateAdminOrderEmail, generateCustomerConfirmationEmail, getEmailConfig, type EmailConfig } from "./_core/email";

function requireDb() {
  return getDb().then(db => {
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The store database is unavailable." });
    return db;
  });
}

function readStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalizedPrice(value: string): string {
  const [whole, fraction = ""] = value.trim().split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

function priceToMinor(value: string): number {
  const [whole, fraction = "00"] = normalizedPrice(value).split(".");
  return Number(whole) * 100 + Number(fraction.slice(0, 2));
}

function minorToPrice(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

function productSlug(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "piece";
  return `${base}-${nanoid(6).toLowerCase()}`;
}

async function imagesByProductIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await requireDb();
  return db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(productImages.position, productImages.id);
}

function mapProduct(
  row: typeof products.$inferSelect,
  imageRows: Awaited<ReturnType<typeof imagesByProductIds>>,
): StoreProduct {
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
    images: imageRows
      .filter(image => image.productId === row.id)
      .map(image => ({
        id: image.id,
        url: image.url,
        storageKey: image.storageKey,
        altText: image.altText,
        position: image.position,
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listStoreProducts(includeUnpublished = false): Promise<StoreProduct[]> {
  const db = await requireDb();
  const rows = includeUnpublished
    ? await db.select().from(products).orderBy(desc(products.createdAt))
    : await db
        .select()
        .from(products)
        .where(eq(products.isPublished, 1))
        .orderBy(desc(products.createdAt));
  const imageRows = await imagesByProductIds(rows.map(row => row.id));
  return rows.map(row => mapProduct(row, imageRows));
}

export async function getStoreProduct(id: number): Promise<StoreProduct | null> {
  const db = await requireDb();
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return null;
  const imageRows = await imagesByProductIds([id]);
  return mapProduct(row, imageRows);
}

function productValues(input: ProductInput) {
  if (input.promoPrice && priceToMinor(input.promoPrice) >= priceToMinor(input.price)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Promo price must be lower than the regular price." });
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
    sizesJson: JSON.stringify(input.sizes.map(value => value.trim()).filter(Boolean)),
    colorsJson: JSON.stringify(input.colors.map(value => value.trim()).filter(Boolean)),
  };
}

async function saveImages(productId: number, input: ProductInput) {
  if (input.images.length === 0) return;
  const db = await requireDb();
  await db.insert(productImages).values(
    input.images.map((image, position) => ({
      productId,
      url: image.url,
      storageKey: image.storageKey,
      altText: image.altText?.trim() || null,
      position: image.position ?? position,
    })),
  );
}

export async function createStoreProduct(input: ProductInput): Promise<StoreProduct> {
  const db = await requireDb();
  const slug = productSlug(input.title);
  const now = Date.now();
  await db.insert(products).values({ ...productValues(input), slug, createdAt: now, updatedAt: now });
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The product could not be loaded after saving." });
  await saveImages(row.id, input);
  return (await getStoreProduct(row.id))!;
}

export async function updateStoreProduct(id: number, input: ProductInput): Promise<StoreProduct> {
  const db = await requireDb();
  const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "That product no longer exists." });
  await db.update(products).set({ ...productValues(input), updatedAt: Date.now() }).where(eq(products.id, id));
  await db.delete(productImages).where(eq(productImages.productId, id));
  await saveImages(id, input);
  return (await getStoreProduct(id))!;
}

export async function deleteStoreProduct(id: number) {
  const db = await requireDb();
  await db.delete(productImages).where(eq(productImages.productId, id));
  await db.delete(products).where(eq(products.id, id));
  return { success: true as const };
}

export type CreateOrderInput = {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerNote?: string;
  lines: Array<{ productId: number; quantity: number; size?: string; color?: string }>;
};

export async function submitStoreOrder(input: CreateOrderInput) {
  const db = await requireDb();
  const ids = Array.from(new Set(input.lines.map(line => line.productId)));
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const productById = new Map(rows.map(row => [row.id, row]));
  if (productById.size !== ids.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "One or more items are no longer available. Please refresh your bag." });
  }

  const currencies = new Set(rows.map(row => row.currencyCode));
  if (currencies.size !== 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Items in one order must use the same currency." });
  }

  const currencyCode = Array.from(currencies)[0];
  let totalMinor = 0;
  const orderLines = input.lines.map(line => {
    const product = productById.get(line.productId)!;
    if (product.isPublished !== 1 || product.stockStatus !== "in_stock") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `${product.title} is not currently available.` });
    }
    const sizes = readStringList(product.sizesJson);
    const colors = readStringList(product.colorsJson);
    if (line.size && sizes.length && !sizes.includes(line.size)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Please choose an available size for ${product.title}.` });
    }
    if (line.color && colors.length && !colors.includes(line.color)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Please choose an available colour for ${product.title}.` });
    }
    const unitMinor = priceToMinor(product.promoPrice ?? String(product.price));
    const lineTotalMinor = unitMinor * line.quantity;
    totalMinor += lineTotalMinor;
    const variantLabel = [line.size ? `Size ${line.size}` : "", line.color ?? ""]
      .filter(Boolean)
      .join(" · ") || "Standard";
    return {
      productId: product.id,
      productTitle: product.title,
      variantLabel,
      unitPrice: minorToPrice(unitMinor),
      quantity: line.quantity,
      lineTotal: minorToPrice(lineTotalMinor),
    };
  });

  const now = Date.now();
  const orderNumber = `ORD-${new Date(now).toISOString().slice(0, 10).replace(/-/g, "")}-${nanoid(5).toUpperCase()}`;
  await db.transaction(async tx => {
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
      updatedAt: now,
    });
    const [savedOrder] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    if (!savedOrder) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The order could not be confirmed." });
    await tx.insert(orderItems).values(orderLines.map(line => ({ ...line, orderId: savedOrder.id })));
  });

  // Send emails after transaction commits
  const orderForEmail = {
    orderNumber,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim() || null,
    customerPhone: input.customerPhone.trim(),
    customerNote: input.customerNote?.trim() || null,
    total: minorToPrice(totalMinor),
    currencyCode,
    items: orderLines,
    createdAt: now,
  };

  // Fire-and-forget: don't block the response
  const adminEmail = generateAdminOrderEmail(orderForEmail);
  sendEmail(getEmailConfig()?.user ?? "", adminEmail.subject, adminEmail.html).catch(console.error);
  if (orderForEmail.customerEmail) {
    const customerEmail = generateCustomerConfirmationEmail(orderForEmail);
    sendEmail(orderForEmail.customerEmail, customerEmail.subject, customerEmail.html).catch(console.error);
  }

  return { orderNumber, total: minorToPrice(totalMinor), currencyCode, createdAt: now };
}

export async function listStoreOrders(): Promise<StoreOrder[]> {
  const db = await requireDb();
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  if (orderRows.length === 0) return [];
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderRows.map(order => order.id)));
  return orderRows.map(order => ({
    ...order,
    total: String(order.total),
    status: order.status as OrderStatus,
    items: itemRows
      .filter(item => item.orderId === order.id)
      .map(item => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        variantLabel: item.variantLabel,
        unitPrice: String(item.unitPrice),
        quantity: item.quantity,
        lineTotal: String(item.lineTotal),
      })),
  }));
}

export async function setStoreOrderStatus(id: number, status: OrderStatus) {
  const db = await requireDb();
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "That order could not be found." });
  await db.update(orders).set({ status, updatedAt: Date.now() }).where(eq(orders.id, id));
  return { success: true as const };
}

export function publicProduct(product: StoreProduct): PublicStoreProduct {
  const { slug: _slug, isPublished: _isPublished, ...visible } = product;
  return visible;
}
