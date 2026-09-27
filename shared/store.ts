export type StockStatus = "in_stock" | "out_of_stock";
export type OrderStatus = "new" | "contacted" | "confirmed" | "fulfilled" | "cancelled";

export type ProductImage = {
  id?: number;
  url: string;
  storageKey: string;
  altText: string | null;
  position: number;
};

export type StoreProduct = {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: string;
  promoPrice: string | null;
  currencyCode: string;
  stockStatus: StockStatus;
  isPublished: boolean;
  sizes: string[];
  colors: string[];
  images: ProductImage[];
  createdAt: number;
  updatedAt: number;
};

export type PublicStoreProduct = Omit<StoreProduct, "slug" | "isPublished">;

export type CartLine = {
  lineId: string;
  productId: number;
  title: string;
  imageUrl: string | null;
  price: string;
  currencyCode: string;
  quantity: number;
  size: string;
  color: string;
};

export type OrderLineSummary = {
  id: number;
  productId: number | null;
  productTitle: string;
  variantLabel: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export type StoreOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerNote: string | null;
  status: OrderStatus;
  total: string;
  currencyCode: string;
  createdAt: number;
  updatedAt: number;
  items: OrderLineSummary[];
};

export type UploadedProductImage = {
  url: string;
  storageKey: string;
  altText: string | null;
  position: number;
};

export type ProductInput = {
  title: string;
  description: string;
  category: string;
  price: string;
  promoPrice: string | null;
  currencyCode: string;
  stockStatus: StockStatus;
  isPublished: boolean;
  sizes: string[];
  colors: string[];
  images: UploadedProductImage[];
};
