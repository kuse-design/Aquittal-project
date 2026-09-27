import type { CartLine, PublicStoreProduct } from "@shared/store";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CartContextValue = {
  items: CartLine[];
  isOpen: boolean;
  itemCount: number;
  subtotal: string;
  currencyCode: string;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: PublicStoreProduct, size?: string, color?: string) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
};

const CART_STORAGE_KEY = "custom-store:cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line): line is CartLine =>
      line && typeof line.lineId === "string" && typeof line.productId === "number" &&
      typeof line.title === "string" && typeof line.price === "string" &&
      typeof line.currencyCode === "string" && typeof line.quantity === "number",
    );
  } catch {
    return [];
  }
}

function toMinor(value: string) {
  const [whole, fraction = "00"] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function fromMinor(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => readCart());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(async (product: PublicStoreProduct, size = "", color = "") => {
    if (product.stockStatus !== "in_stock") {
      throw new Error("This item is currently out of stock.");
    }
    if (items.length && items[0].currencyCode !== product.currencyCode) {
      throw new Error("Please place separate orders for items in different currencies.");
    }
    setItems(current => {
      const existing = current.find(line => line.productId === product.id && line.size === size && line.color === color);
      if (existing) {
        return current.map(line => line.lineId === existing.lineId
          ? { ...line, quantity: Math.min(99, line.quantity + 1) }
          : line);
      }
      const next: CartLine = {
        lineId: crypto.randomUUID(),
        productId: product.id,
        title: product.title,
        imageUrl: product.images[0]?.url ?? null,
        price: product.promoPrice ?? product.price,
        currencyCode: product.currencyCode,
        quantity: 1,
        size,
        color,
      };
      return [...current, next];
    });
    setIsOpen(true);
  }, [items]);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(current => current.filter(line => line.lineId !== lineId));
      return;
    }
    setItems(current => current.map(line => line.lineId === lineId ? { ...line, quantity: Math.min(99, quantity) } : line));
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems(current => current.filter(line => line.lineId !== lineId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const itemCount = items.reduce((total, line) => total + line.quantity, 0);
  const currencyCode = items[0]?.currencyCode ?? "USD";
  const subtotal = fromMinor(items.reduce((total, line) => total + toMinor(line.price) * line.quantity, 0));

  const value = useMemo<CartContextValue>(() => ({
    items,
    isOpen,
    itemCount,
    subtotal,
    currencyCode,
    openCart,
    closeCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, isOpen, itemCount, subtotal, currencyCode, openCart, closeCart, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
