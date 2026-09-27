import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { publicProduct, listStoreProducts, submitStoreOrder } from "../store.db";

const orderLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  size: z.string().trim().max(40).optional(),
  color: z.string().trim().max(40).optional(),
});

export const storefrontRouter = router({
  products: router({
    list: publicProcedure.query(async () => {
      const products = await listStoreProducts(false);
      return products.map(publicProduct);
    }),
  }),
  orders: router({
    submit: publicProcedure
      .input(
        z.object({
          customerName: z.string().trim().min(2).max(180),
          customerEmail: z.union([z.string().trim().email().max(320), z.literal("")]).optional(),
          customerPhone: z.string().trim().min(6).max(50),
          customerNote: z.string().trim().max(2000).optional(),
          lines: z.array(orderLineSchema).min(1).max(50),
        }),
      )
      .mutation(({ input }) => submitStoreOrder(input)),
  }),
});
