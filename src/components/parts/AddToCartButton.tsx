"use client";

/**
 * AddToCartButton — Client-side button that adds a part to the cart.
 *
 * Used in the part detail server component so the rest of the page
 * can stay server-rendered.
 */

import { useState } from "react";
import { useCart } from "@/hooks";

interface Props {
  id: string;
  name: string;
  vendorName: string;
  vendorId: string;
  sku: string;
  price: number;
  image?: string;
  stock: number;
  compatible?: string;
  installationAvailable: boolean;
}

const CATEGORY_ICON = "construction";

export default function AddToCartButton({
  id,
  name,
  vendorName,
  vendorId,
  sku,
  price,
  image,
  stock,
  compatible,
  installationAvailable,
}: Props) {
  const { addItem, isInCart, getItemQty } = useCart();
  const [adding, setAdding] = useState(false);

  const inCart = isInCart(id);
  const qty = getItemQty(id);

  function handleAdd() {
    if (inCart) return;
    setAdding(true);
    addItem({
      id,
      name,
      vendor: vendorName,
      vendorId,
      sku,
      compatible: compatible ?? "",
      price,
      icon: CATEGORY_ICON,
      image,
      stock,
    });
    setTimeout(() => setAdding(false), 600);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        disabled={adding || stock === 0}
        className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
          inCart
            ? "bg-green-500 text-white shadow-green-500/20"
            : stock === 0
              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-[#FF4B19] text-white shadow-[#FF4B19]/20 hover:opacity-90"
        }`}
      >
        {inCart ? (
          <>
            <span
              className="material-symbols-outlined text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            In Cart ({qty})
          </>
        ) : stock === 0 ? (
          "Out of Stock"
        ) : adding ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Adding…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">shopping_cart</span>
            Add to Cart
          </>
        )}
      </button>

      {installationAvailable && !inCart && (
        <button
          onClick={handleAdd}
          className="w-full py-4 rounded-xl border-2 border-[#FF4B19] text-[#FF4B19] font-bold hover:bg-[#FF4B19]/5 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">build</span>
          Add with Installation
        </button>
      )}
    </div>
  );
}
