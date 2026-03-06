"use client";

/**
 * useCart — Convenience wrapper around CartContext.
 *
 * Re-exports everything from CartContext and adds per-item helpers that
 * ProductCard, the cart drawer, and the checkout flow all need:
 *   - isInCart(id)     — is this part already in the basket?
 *   - getItemQty(id)   — current quantity (0 when absent)
 *   - toggleItem(item) — add if absent, remove if present (wishlist-like UX)
 *   - itemsByVendor    — items grouped by vendorId (useful for vendor order summaries)
 *   - vendorCount      — how many distinct vendors are in the cart
 *
 * Usage:
 *   const { addItem, isInCart, cartCount } = useCart();
 */

import { useCallback, useMemo } from "react";
import {
  useCart as useCartContext,
  type CartContextValue,
  type CartItem,
  type AddCartItemInput,
} from "@/context/CartContext";

export type { CartItem, AddCartItemInput };

export interface UseCartReturn extends CartContextValue {
  /** True if a product id is already in the cart */
  isInCart: (id: string) => boolean;
  /** Current quantity of a given item id (0 when not present) */
  getItemQty: (id: string) => number;
  /**
   * If the item is already in the cart, removes it.
   * Otherwise adds it with qty 1 (or the qty provided in the input).
   */
  toggleItem: (item: AddCartItemInput) => void;
  /** Cart lines grouped by vendorId */
  itemsByVendor: Record<string, CartItem[]>;
  /** Number of distinct vendors represented in the cart */
  vendorCount: number;
  /** True when the cart has at least one item */
  hasItems: boolean;
  /** Formatted subtotal string e.g. "EGP 3,150" */
  subtotalFormatted: string;
  /** Formatted total string e.g. "EGP 3,249" */
  totalFormatted: string;
}

export function useCart(): UseCartReturn {
  const ctx = useCartContext();

  const isInCart = useCallback(
    (id: string) => ctx.items.some((it) => it.id === id),
    [ctx.items],
  );

  const getItemQty = useCallback(
    (id: string) => ctx.items.find((it) => it.id === id)?.qty ?? 0,
    [ctx.items],
  );

  const toggleItem = useCallback(
    (item: AddCartItemInput) => {
      if (ctx.items.some((it) => it.id === item.id)) {
        ctx.removeItem(item.id);
      } else {
        ctx.addItem(item);
      }
    },
    [ctx],
  );

  const itemsByVendor = useMemo(() => {
    return ctx.items.reduce<Record<string, CartItem[]>>((acc, item) => {
      const key = item.vendorId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [ctx.items]);

  const vendorCount = useMemo(
    () => Object.keys(itemsByVendor).length,
    [itemsByVendor],
  );

  const hasItems = ctx.items.length > 0;

  const subtotalFormatted = useMemo(
    () => `EGP ${ctx.subtotal.toLocaleString("en-EG")}`,
    [ctx.subtotal],
  );

  const totalFormatted = useMemo(
    () => `EGP ${ctx.total.toLocaleString("en-EG")}`,
    [ctx.total],
  );

  return {
    ...ctx,
    isInCart,
    getItemQty,
    toggleItem,
    itemsByVendor,
    vendorCount,
    hasItems,
    subtotalFormatted,
    totalFormatted,
  };
}
