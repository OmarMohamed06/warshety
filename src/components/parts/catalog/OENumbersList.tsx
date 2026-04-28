import type { DbOeNumber } from "@/types/database";

interface Props {
  oeNumbers: DbOeNumber[];
  productLabel?: string;
  isAr?: boolean;
}

/**
 * OENumbersList — Section 4
 *
 * Table layout matching TecDoc / autodoc OE number pages:
 *   AIRTEX        WPK 167802
 *   ALFA ROMEO    9467643789  9467644089  71775923
 *   CITROËN       0516 L5  98 013 763 80  …
 */
export function OENumbersList({ oeNumbers, productLabel, isAr }: Props) {
  if (oeNumbers.length === 0) return null;

  const grouped = groupByManufacturer(oeNumbers);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-5">
        {productLabel
          ? isAr
            ? `أرقام OE — ${productLabel}`
            : `${productLabel} OE Numbers`
          : isAr
            ? "أرقام OE"
            : "OE Numbers"}
      </h2>

      <table className="w-full text-sm border-collapse">
        <tbody>
          {grouped.map(({ manufacturer, numbers }) => (
            <tr
              key={manufacturer}
              className="border-t border-slate-100 first:border-t-0 align-top"
            >
              {/* Manufacturer column */}
              <td className="py-3 pr-8 w-52 shrink-0 text-slate-600 font-medium uppercase tracking-wide whitespace-nowrap">
                {manufacturer}
              </td>

              {/* OE numbers — inline, wrapping */}
              <td className="py-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {numbers.map((row) => (
                    <span
                      key={row.id}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors font-medium"
                    >
                      {row.oe_number}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function groupByManufacturer(
  rows: DbOeNumber[],
): { manufacturer: string; numbers: DbOeNumber[] }[] {
  const map = new Map<string, DbOeNumber[]>();
  for (const row of rows) {
    if (!map.has(row.manufacturer)) map.set(row.manufacturer, []);
    map.get(row.manufacturer)!.push(row);
  }
  return Array.from(map.entries()).map(([manufacturer, numbers]) => ({
    manufacturer,
    numbers,
  }));
}
