import type { DbProductSpecification } from "@/types/database";

interface Props {
  specifications: DbProductSpecification[];
  productLabel?: string;
  isAr?: boolean;
}

/**
 * ProductSpecifications — Section 2
 *
 * Two-column grid layout matching TecDoc-style technical info tables.
 * Works for ANY part category — specs are stored as dynamic key-value rows.
 */
export function ProductSpecifications({
  specifications,
  productLabel,
  isAr,
}: Props) {
  if (specifications.length === 0) return null;

  // Split specs into two equal columns (left = even indices, right = odd)
  const left = specifications.filter((_, i) => i % 2 === 0);
  const right = specifications.filter((_, i) => i % 2 !== 0);
  const rowCount = Math.max(left.length, right.length);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        {productLabel
          ? isAr
            ? `معلومات تقنية — ${productLabel}`
            : `${productLabel} technical information`
          : isAr
            ? "تفاصيل المنتج"
            : "Product Details"}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIdx) => {
              const lSpec = left[rowIdx];
              const rSpec = right[rowIdx];
              return (
                <tr
                  key={rowIdx}
                  className="border-t border-slate-100 first:border-t-0"
                >
                  {/* Left column */}
                  <td className="py-3 pr-3 w-[22%] text-slate-400 align-top whitespace-nowrap">
                    {lSpec ? `${lSpec.spec_name}:` : ""}
                  </td>
                  <td className="py-3 pr-10 w-[28%] text-slate-800 font-semibold align-top">
                    {lSpec?.spec_value ?? ""}
                  </td>

                  {/* Right column */}
                  <td className="py-3 pr-3 w-[22%] text-slate-400 align-top whitespace-nowrap border-l border-slate-100 pl-6">
                    {rSpec ? `${rSpec.spec_name}:` : ""}
                  </td>
                  <td className="py-3 w-[28%] text-slate-800 font-semibold align-top">
                    {rSpec?.spec_value ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
