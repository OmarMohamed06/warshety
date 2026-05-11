"use client";

/**
 * CartContext — Shopping cart state for the parts marketplace.
 *
 * Handles add / remove / update-quantity / clear, promo codes, and
 * derived totals (subtotal, shipping, discount, grand total).
 *
 * Persistence: localStorage  →  `garage_cart`
 *
 * The CartItem type is exported here so Navbar, ProductCard, and any
 * other consumer can share a single definition rather than duplicating it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CartItemBadge = "OEM" | "Aftermarket" | "Performance" | "Used";

export interface CartItem {
  /** Unique product / variant id */
  id: string;
  name: string;
  vendor: string;
  vendorId: string;
  sku: string;
  /** Human-readable compatibility string, e.g. "BMW 3 Series 2019" */
  compatible: string;
  /** Unit price in EGP */
  price: number;
  qty: number;
  /** Material Symbols icon name used as a placeholder thumbnail */
  icon: string;
  badge?: CartItemBadge;
  image?: string;
  /** Max available stock — used to cap qty increments */
  stock?: number;
}

/** Input when calling addItem — qty defaults to 1 */
export type AddCartItemInput = Omit<CartItem, "qty"> & { qty?: number };

export interface PromoResult {
  code: string;
  /** Percentage discount 0-100 */
  discountPct: number;
  label: string;
}

export interface CartContextValue {
  items: CartItem[];
  isHydrated: boolean;

  /** Total number of individual units across all line items */
  cartCount: number;
  subtotal: number;
  /** 0 when subtotal >= FREE_SHIPPING_THRESHOLD */
  shipping: number;
  discount: number;
  total: number;

  /** Applied promo code, or null */
  promo: PromoResult | null;

  /** Add a part to cart. If the id already exists, increments qty instead. */
  addItem: (item: AddCartItemInput) => void;
  /** Remove a line item entirely */
  removeItem: (id: string) => void;
  /** Set a specific qty. Passing 0 removes the item. */
  updateQty: (id: string, qty: number) => void;
  /** Increment qty by delta. If resulting qty <= 0, removes item. */
  changeQty: (id: string, delta: number) => void;
  /** Empty the entire cart */
  clearCart: () => void;

  /** Returns error string if code is invalid, null if applied successfully */
  applyPromo: (code: string) => Promise<string | null>;
  removePromo: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_SHIPPING_THRESHOLD = 2_000; // EGP
const FLAT_SHIPPING = 99; // EGP

/** Demo promo codes — loaded from Supabase promo_codes table */
// (removed hardcoded codes)

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_CART = "garage_cart";
const STORAGE_PROMO = "garage_promo";

function readItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CART);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function readPromo(): PromoResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROMO);
    return raw ? (JSON.parse(raw) as PromoResult) : null;
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState<PromoResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate once on mount
  useEffect(() => {
    setItems(readItems());
    setPromo(readPromo());
    setIsHydrated(true);
  }, []);

  // Persist items (skip first render)
  const itemsHydratedRef = useRef(false);
  useEffect(() => {
    if (!itemsHydratedRef.current) {
      itemsHydratedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_CART, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // Persist promo (skip first render)
  const promoHydratedRef = useRef(false);
  useEffect(() => {
    if (!promoHydratedRef.current) {
      promoHydratedRef.current = true;
      return;
    }
    try {
      if (promo) {
        localStorage.setItem(STORAGE_PROMO, JSON.stringify(promo));
      } else {
        localStorage.removeItem(STORAGE_PROMO);
      }
    } catch {
      // ignore
    }
  }, [promo]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addItem = useCallback((input: AddCartItemInput) => {
    const qty = input.qty ?? 1;
    setItems((prev) => {
      const existing = prev.find((it) => it.id === input.id);
      if (existing) {
        return prev.map((it) =>
          it.id === input.id
            ? {
                ...it,
                qty: input.stock
                  ? Math.min(it.qty + qty, input.stock)
                  : it.qty + qty,
              }
            : it,
        );
      }
      return [...prev, { ...input, qty }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    } else {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it;
          const capped = it.stock ? Math.min(qty, it.stock) : qty;
          return { ...it, qty: capped };
        }),
      );
    }
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (!item) return prev;
      const next = item.qty + delta;
      if (next <= 0) return prev.filter((it) => it.id !== id);
      const capped = item.stock ? Math.min(next, item.stock) : next;
      return prev.map((it) => (it.id === id ? { ...it, qty: capped } : it));
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPromo(null);
  }, []);

  const applyPromo = useCallback(
    async (code: string): Promise<string | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("promo_codes")
        .select("code, discount_value, label")
        .eq("code", code.toUpperCase().trim())
        .eq("active", true)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .maybeSingle();
      const row = data as unknown as {
        code: string;
        discount_value: number;
        label: string;
      } | null;
      if (!row) return "Invalid or expired promo code.";
      setPromo({
        code: row.code,
        discountPct: row.discount_value,
        label: row.label,
      });
      return null;
    },
    [],
  );

  const removePromo = useCallback(() => {
    setPromo(null);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const cartCount = useMemo(
    () => items.reduce((s, it) => s + it.qty, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.price * it.qty, 0),
    [items],
  );

  const discount = useMemo(
    () => (promo ? Math.round(subtotal * (promo.discountPct / 100)) : 0),
    [subtotal, promo],
  );

  const discountedSubtotal = subtotal - discount;

  const shipping = useMemo(
    () => (discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING),
    [discountedSubtotal],
  );

  const total = useMemo(
    () => discountedSubtotal + shipping,
    [discountedSubtotal, shipping],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isHydrated,
      cartCount,
      subtotal,
      shipping,
      discount,
      total,
      promo,
      addItem,
      removeItem,
      updateQty,
      changeQty,
      clearCart,
      applyPromo,
      removePromo,
    }),
    [
      items,
      isHydrated,
      cartCount,
      subtotal,
      shipping,
      discount,
      total,
      promo,
      addItem,
      removeItem,
      updateQty,
      changeQty,
      clearCart,
      applyPromo,
      removePromo,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
