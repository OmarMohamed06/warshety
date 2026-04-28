import type { DbCatalogProduct } from "@/types/database";

interface Props {
  product: DbCatalogProduct;
  isAr?: boolean;
}

/**
 * ProductHeader — Section 1
 *
 * Displays core product identity: name, brand, manufacturer,
 * MPN, EAN, brand class, and category badge.
 */
export function ProductHeader({ product, isAr }: Props) {
  const brandClassColor: Record<string, string> = {
    Premium: "bg-amber-100 text-amber-800 border-amber-200",
    OEM: "bg-blue-100 text-blue-800 border-blue-200",
    Aftermarket: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const badgeClass =
    product.brand_class && brandClassColor[product.brand_class]
      ? brandClassColor[product.brand_class]
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Category + brand class badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {product.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {product.category}
          </span>
        )}
        {product.brand_class && (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
          >
            {product.brand_class}
          </span>
        )}
      </div>

      {/* Product name */}
      <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-4">
        {product.name}
      </h1>

      {/* Description */}
      {product.description && (
        <p className="text-slate-500 text-sm leading-relaxed mb-5">
          {product.description}
        </p>
      )}

      {/* Identity grid */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm border-t border-slate-100 pt-5">
        <IdentityRow
          label={isAr ? "الماركة" : "Brand"}
          value={product.brand}
          bold
        />
        <IdentityRow
          label={isAr ? "الشركة المصنعة" : "Manufacturer"}
          value={product.manufacturer}
        />
        <IdentityRow
          label={isAr ? "رقم القطعة (MPN)" : "Part Number (MPN)"}
          value={product.manufacturer_part_number}
          mono
        />
        {product.ean && (
          <IdentityRow
            label={isAr ? "EAN / GTIN" : "EAN / GTIN"}
            value={product.ean}
            mono
          />
        )}
      </dl>
    </div>
  );
}

// ─── Sub-component ───────────────────────────────────────────────────────────

function IdentityRow({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between sm:block">
      <dt className="text-slate-400 font-medium">{label}</dt>
      <dd
        className={`text-slate-800 mt-0.5 ${bold ? "font-semibold" : ""} ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
