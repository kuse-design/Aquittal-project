import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { OrderStatus } from "../../shared/store";
import { storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";
import {
  createStoreProduct,
  deleteStoreProduct,
  listStoreOrders,
  listStoreProducts,
  setStoreOrderStatus,
  updateStoreProduct,
} from "../store.db";

const moneyInput = z
  .string()
  .trim()
  .regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter a price with up to two decimal places.")
  .refine(value => Number(value) > 0, "Price must be greater than zero.");
const productInput = z
  .object({
    title: z.string().trim().min(2).max(180),
    description: z.string().max(5000),
    category: z.string().trim().max(100),
    price: moneyInput,
    promoPrice: moneyInput.nullable(),
    currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/),
    stockStatus: z.enum(["in_stock", "out_of_stock"]),
    isPublished: z.boolean(),
    sizes: z.array(z.string().trim().min(1).max(40)).max(15),
    colors: z.array(z.string().trim().min(1).max(40)).max(15),
    images: z.array(
      z.object({
        url: z.string().min(1).max(1024),
        storageKey: z.string().min(1).max(512),
        altText: z.string().max(255).nullable(),
        position: z.number().int().min(0).max(20),
      }),
    ).max(8),
  })
  .superRefine((value, context) => {
    if (value.promoPrice !== null) {
      const regular = Math.round(Number(value.price) * 100);
      const promo = Math.round(Number(value.promoPrice) * 100);
      if (promo >= regular) {
        context.addIssue({ code: "custom", path: ["promoPrice"], message: "Promo price must be lower than regular price." });
      }
    }
  });

const uploadInput = z.object({
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentBase64: z.string().min(1).max(7_000_000),
});

function hasValidImageSignature(data: Buffer, contentType: string) {
  if (contentType === "image/jpeg") return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (contentType === "image/png") return data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.length > 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
}

export const adminRouter = router({
  products: router({
    list: adminProcedure.query(() => listStoreProducts(true)),
    create: adminProcedure.input(productInput).mutation(({ input }) => createStoreProduct(input)),
    update: adminProcedure
      .input(z.object({ id: z.number().int().positive(), product: productInput }))
      .mutation(({ input }) => updateStoreProduct(input.id, input.product)),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteStoreProduct(input.id)),
  }),
  orders: router({
    list: adminProcedure.query(() => listStoreOrders()),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "confirmed", "fulfilled", "cancelled"]) }))
      .mutation(({ input }) => setStoreOrderStatus(input.id, input.status as OrderStatus)),
  }),
  uploadImage: adminProcedure.input(uploadInput).mutation(async ({ input }) => {
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[input.contentType];
    const data = Buffer.from(input.contentBase64, "base64");
    if (data.length === 0 || data.length > 5 * 1024 * 1024 || !hasValidImageSignature(data, input.contentType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a valid JPEG, PNG, or WebP image up to 5 MB." });
    }
    const stored = await storagePut(`store-products/${nanoid(16)}.${extension}`, data, input.contentType);
    return { url: stored.url, storageKey: stored.key, altText: input.fileName.replace(/\.[^.]+$/, "").slice(0, 255) };
  }),
});