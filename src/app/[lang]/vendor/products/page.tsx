"use client";

import { useEffect, useState, useMemo } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import type { VendorProduct } from "@/types/vendor-products";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Tag,
} from "lucide-react";

const CATEGORY_TAB_KEYS = [
  { key: "catAll", filter: "All" },
  { key: "catBrakes", filter: "Brakes" },
  { key: "catFilters", filter: "Filters" },
  { key: "catEngine", filter: "Engine" },
  { key: "catSuspension", filter: "Suspension" },
  { key: "catElectrical", filter: "Electrical" },
  { key: "catTransmission", filter: "Transmission" },
  { key: "catCooling", filter: "Cooling" },
  { key: "catExhaust", filter: "Exhaust" },
  { key: "catSteering", filter: "Steering" },
  { key: "catBody", filter: "Body" },
  { key: "catInterior", filter: "Interior" },
  { key: "catLighting", filter: "Lighting" },
  { key: "catOther", filter: "Other" },
];

export default function VendorProductsPage() {
  const { vendor } = useAuth();
  const { t, locale } = useLanguage();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load products ─────────────────────────────────────────────
  async function loadProducts() {
    if (!vendor) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await (supabase as any)
        .from("products")
        .select(
          "id, vendor_id, name, brand, part_number, category, subcategory, description, price, original_price, stock, active, created_at, updated_at",
        )
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (dbError) throw new Error(dbError.message);
      // Normalise to VendorProduct shape expected by this page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalised = (data ?? []).map((r: any) => ({
        ...r,
        manufacturer_part_number: r.part_number ?? null,
        manufacturer: null,
        ean: null,
        stock_quantity: r.stock ?? 0,
        discount_percent: r.original_price
          ? Math.round((1 - r.price / r.original_price) * 100)
          : 0,
        effective_price: r.price,
      }));
      setProducts(normalised as VendorProduct[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor]);

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm(t("vendor.deleteProductConfirm"))) return;
    setDeletingId(id);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from("products")
        .delete()
        .eq("id", id);

      if (dbError) throw new Error(dbError.message);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("vendor.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.manufacturer_part_number ?? "").toLowerCase().includes(q);

      const matchCat =
        activeTab === "All" ||
        (p.category ?? "").toLowerCase() === activeTab.toLowerCase();

      return matchSearch && matchCat;
    });
  }, [products, search, activeTab]);

  // ── Stats ─────────────────────────────────────────────────────
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  // ── Helpers ───────────────────────────────────────────────────
  function stockBadge(qty: number) {
    if (qty === 0)
      return (
        <Badge variant="destructive" className="text-xs">
          {t("vendor.outOfStock")}
        </Badge>
      );
    if (qty <= 5)
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
          {t("vendor.lowStock")} — {qty}
        </Badge>
      );
    return (
      <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
        {qty} {t("vendor.inStock").toLowerCase()}
      </Badge>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6 px-1">
        {/* ── Page header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("vendor.productsTitle")}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {t("vendor.productsSubtitle")}
            </p>
          </div>
          <Button asChild>
            <Link href="/vendor/products/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("vendor.addProduct")}
            </Link>
          </Button>
        </div>

        {/* ── Stats cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {t("vendor.totalProducts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {t("vendor.inStock")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <p className="text-3xl font-bold text-green-700">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {t("vendor.outOfStock")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <p className="text-3xl font-bold text-red-600">
                {outOfStockCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t("vendor.searchProducts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_TAB_KEYS.map((tab) => (
              <button
                key={tab.filter}
                onClick={() => setActiveTab(tab.filter)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.filter
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t(`vendor.${tab.key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProducts}
              className="ml-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {t("vendor.retry")}
            </Button>
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-5">{t("vendor.product")}</TableHead>
                  <TableHead>{t("vendor.category")}</TableHead>
                  <TableHead className="text-right">
                    {t("vendor.price")}
                  </TableHead>
                  <TableHead>{t("vendor.stock")}</TableHead>
                  <TableHead className="text-right pr-5">
                    {t("vendor.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Loading skeletons */}
                {loading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5">
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-44" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <Skeleton className="h-8 w-24 ml-auto rounded" />
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">
                        {products.length === 0
                          ? t("vendor.noProducts")
                          : t("vendor.noProductsSearch")}
                      </p>
                      {products.length === 0 && (
                        <Button asChild className="mt-4">
                          <Link href="/vendor/products/new">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            {t("vendor.addFirstProduct")}
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {/* Product rows */}
                {!loading &&
                  filtered.map((product) => {
                    const catalogSlug: string | null = null;
                    const isDeleting = deletingId === product.id;

                    return (
                      <TableRow
                        key={product.id}
                        className={isDeleting ? "opacity-50" : ""}
                      >
                        {/* Product info */}
                        <TableCell className="pl-5 py-3">
                          <p className="font-medium text-slate-900 text-sm">
                            {locale === "ar"
                              ? product.name_ar || product.name
                              : product.name_en || product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.brand && (
                              <span className="text-xs text-slate-500">
                                {product.brand}
                              </span>
                            )}
                            {product.manufacturer_part_number && (
                              <span className="text-xs font-mono text-slate-400">
                                #{product.manufacturer_part_number}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {product.category ? (
                              <Badge
                                variant="secondary"
                                className="text-xs capitalize w-fit"
                              >
                                {product.category}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                            {product.subcategory && (
                              <span className="text-[11px] text-slate-400">
                                {product.subcategory}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Price */}
                        <TableCell className="text-right">
                          {(() => {
                            const discPct = product.discount_percent ?? 0;
                            const effectivePrice =
                              product.effective_price ?? product.price;
                            return (
                              <div className="flex flex-col items-end gap-0.5">
                                {discPct > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1.5 py-0 gap-0.5"
                                  >
                                    <Tag className="h-2.5 w-2.5" />-{discPct}%
                                  </Badge>
                                )}
                                <span className="font-semibold text-slate-900 text-sm">
                                  {locale === "ar" ? "ج.م" : "EGP"}{" "}
                                  {effectivePrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                {discPct > 0 && (
                                  <span className="text-xs text-slate-400 line-through">
                                    {locale === "ar" ? "ج.م" : "EGP"}{" "}
                                    {Number(product.price).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>

                        {/* Stock */}
                        <TableCell>
                          {stockBadge(product.stock_quantity)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right pr-5">
                          <div className="flex items-center justify-end gap-1">
                            {catalogSlug && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                title={t("vendor.viewOnSite")}
                              >
                                <Link
                                  href={`/parts/${catalogSlug}`}
                                  target="_blank"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                              title={t("vendor.editProduct")}
                            >
                              <Link
                                href={`/vendor/products/${product.id}/edit`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(product.id)}
                              disabled={isDeleting}
                              title={t("vendor.deleteProduct")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Row count footer */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-right">
            {t("vendor.showingOf")
              .replace("{count}", String(filtered.length))
              .replace("{total}", String(totalCount))}
          </p>
        )}
      </div>
    </VendorLayout>
  );
}
