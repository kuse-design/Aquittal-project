import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const storeMocks = vi.hoisted(() => ({
  listStoreProducts: vi.fn(),
  publicProduct: vi.fn((product: Record<string, unknown>) => {
    const { slug: _slug, isPublished: _isPublished, ...visible } = product;
    return visible;
  }),
  submitStoreOrder: vi.fn(),
  listStoreOrders: vi.fn(),
  createStoreProduct: vi.fn(),
  updateStoreProduct: vi.fn(),
  deleteStoreProduct: vi.fn(),
  setStoreOrderStatus: vi.fn(),
}));

vi.mock("./store.db", async importOriginal => {
  const actual = await importOriginal<typeof import("./store.db")>();
  return { ...actual, ...storeMocks };
});

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUser(role: "admin" | "user"): AuthenticatedUser {
  return {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

const sampleProduct = {
  id: 1,
  title: "Everyday Shirt",
  slug: "everyday-shirt-abc123",
  description: "Soft cotton shirt",
  category: "Shirts",
  price: "45.00",
  promoPrice: "35.00",
  currencyCode: "USD",
  stockStatus: "in_stock" as const,
  isPublished: true,
  sizes: ["S", "M", "L"],
  colors: ["Black"],
  images: [],
  createdAt: 1,
  updatedAt: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  storeMocks.listStoreProducts.mockResolvedValue([]);
  storeMocks.listStoreOrders.mockResolvedValue([]);
  storeMocks.submitStoreOrder.mockResolvedValue({ orderNumber: "ORD-TEST", total: "35.00", currencyCode: "USD", createdAt: 1 });
});

afterEach(() => vi.restoreAllMocks());

describe("storefront catalog and manual orders", () => {
  it("shows public products without admin-only publication fields", async () => {
    storeMocks.listStoreProducts.mockResolvedValue([sampleProduct]);
    const caller = appRouter.createCaller(makeCtx());

    const visible = await caller.storefront.products.list();

    expect(storeMocks.listStoreProducts).toHaveBeenCalledWith(false);
    expect(visible[0]).toMatchObject({ id: 1, title: "Everyday Shirt", promoPrice: "35.00" });
    expect(visible[0]).not.toHaveProperty("isPublished");
    expect(visible[0]).not.toHaveProperty("slug");
  });

  it("accepts a valid public order request and delegates authoritative price calculation to the server", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const input = {
      customerName: "Alex Customer",
      customerEmail: "alex@example.com",
      customerPhone: "+1234567890",
      customerNote: "Please call before delivery",
      lines: [{ productId: 1, quantity: 2, size: "M", color: "Black" }],
    };

    await expect(caller.storefront.orders.submit(input)).resolves.toMatchObject({ orderNumber: "ORD-TEST" });
    expect(storeMocks.submitStoreOrder).toHaveBeenCalledWith(input);
  });

  it("rejects malformed order details before any order is created", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.storefront.orders.submit({
      customerName: "A",
      customerEmail: "not-an-email",
      customerPhone: "123456",
      lines: [{ productId: 1, quantity: 0 }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storeMocks.submitStoreOrder).not.toHaveBeenCalled();
  });
});

describe("admin store permissions", () => {
  it("blocks anonymous visitors from product management", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storeMocks.listStoreProducts).not.toHaveBeenCalled();
  });

  it("blocks signed-in customers from order and product administration", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("user")));
    await expect(caller.admin.products.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.orders.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storeMocks.listStoreProducts).not.toHaveBeenCalled();
    expect(storeMocks.listStoreOrders).not.toHaveBeenCalled();
  });

  it("allows an admin account to read the product catalog", async () => {
    storeMocks.listStoreProducts.mockResolvedValue([sampleProduct]);
    const caller = appRouter.createCaller(makeCtx(makeUser("admin")));
    await expect(caller.admin.products.list()).resolves.toEqual([sampleProduct]);
    expect(storeMocks.listStoreProducts).toHaveBeenCalledWith(true);
  });
});
