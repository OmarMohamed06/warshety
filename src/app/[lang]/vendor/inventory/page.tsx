"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Boxes,
  AlertTriangle,
  ShoppingCartIcon,
  DollarSign,
  RefreshCw,
  Pencil,
  Loader2,
} from "lucide-react";

interface InventoryRow {
  id: string;
  name: string;
  part_number: string | null;
  category: string;
  brand: string | null;
  condition: string;
  stock: number;
  price: number;
  active: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

export default function VendorInventoryPage() {
  const { vendor, vendorType, isLoading } = useAuth();
  const { t, localePath } = useLanguage();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});

  // Guard: parts_seller only
  useEffect(() => {
    if (!isLoading && vendorType && vendorType !== "parts_seller") {
      router.replace(localePath("/vendor/dashboard"));
    }
  }, [isLoading, vendorType, router]);

  const loadInventory = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, part_number, category, brand, condition, stock, price, active",
        )
        .eq("vendor_id", vendor.id)
        .order("stock", { ascending: true });
      setRows((data ?? []) as unknown as InventoryRow[]);
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (!isLoading && !vendor) setLoading(false);
  }, [isLoading, vendor]);

  async function handleStockSave(productId: string) {
    const rawValue = stockEdits[productId];
    const newStock = parseInt(rawValue, 10);
    if (isNaN(newStock) || newStock < 0) return;

    setUpdating(productId);
    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);
    setUpdating(null);
    setStockEdits((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    await loadInventory();
  }

  const filtered = rows.filter((r) => {
    if (filter === "low") return r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD;
    if (filter === "out") return r.stock === 0;
    return true;
  });

  const totalValue = rows.reduce((s, r) => s + r.price * r.stock, 0);
  const lowCount = rows.filter(
    (r) => r.stock > 0 && r.stock <= LOW_STOCK_THRESHOLD,
  ).length;
  const outCount = rows.filter((r) => r.stock === 0).length;

  const stockBadge = (stock: number) => {
    if (stock === 0)
      return <Badge variant="destructive">{t("vendor.outOfStock")}</Badge>;
    if (stock <= LOW_STOCK_THRESHOLD)
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
          {t("vendor.lowStock")}
        </Badge>
      );
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
        {t("vendor.inStock")}
      </Badge>
    );
  };

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              {t("vendor.inventoryManagement")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("vendor.monitorStock")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadInventory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("vendor.refresh")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: t("vendor.totalProducts"),
              value: rows.length,
              Icon: Boxes,
              color: "text-blue-600",
            },
            {
              label: t("vendor.lowStock"),
              value: lowCount,
              Icon: AlertTriangle,
              color: "text-amber-600",
            },
            {
              label: t("vendor.outOfStock"),
              value: outCount,
              Icon: ShoppingCartIcon,
              color: "text-red-600",
            },
            {
              label: t("vendor.inventoryValue"),
              value: `EGP ${totalValue.toLocaleString("en-EG")}`,
              Icon: DollarSign,
              color: "text-emerald-600",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.Icon className={`w-5 h-5 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">
                    {s.label}
                  </span>
                </div>
                <p className="text-xl font-black">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "low", "out"] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? "default" : "outline"}
              size="sm"
            >
              {f === "all"
                ? t("vendor.allProducts")
                : f === "low"
                  ? `${t("vendor.lowStockFilter")} (${lowCount})`
                  : `${t("vendor.outOfStockFilter")} (${outCount})`}
            </Button>
          ))}
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <CardContent className="py-16 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("vendor.noProductsFilter")}</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.product")}</TableHead>
                    <TableHead>{t("vendor.sku")}</TableHead>
                    <TableHead>{t("vendor.category")}</TableHead>
                    <TableHead>{t("vendor.condition")}</TableHead>
                    <TableHead>{t("vendor.price")}</TableHead>
                    <TableHead>{t("vendor.stock")}</TableHead>
                    <TableHead>{t("vendor.status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const isEditing = row.id in stockEdits;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-semibold">{row.name}</p>
                          {row.brand && (
                            <p className="text-xs text-muted-foreground">
                              {row.brand}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.part_number ?? "—"}
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="capitalize">
                          {row.condition === "new"
                            ? t("parts.new")
                            : row.condition === "used"
                              ? t("parts.used")
                              : row.condition === "refurbished"
                                ? t("parts.refurbished")
                                : row.condition}
                        </TableCell>
                        <TableCell className="font-bold">
                          EGP {row.price.toLocaleString("en-EG")}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              className="w-20 h-8 text-sm"
                              value={stockEdits[row.id]}
                              onChange={(e) =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [row.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span
                              className={`font-bold ${row.stock === 0 ? "text-red-500" : row.stock <= LOW_STOCK_THRESHOLD ? "text-amber-500" : ""}`}
                            >
                              {row.stock}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{stockBadge(row.stock)}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleStockSave(row.id)}
                                disabled={updating === row.id}
                              >
                                {updating === row.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  t("vendor.saveStock")
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() =>
                                  setStockEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[row.id];
                                    return next;
                                  })
                                }
                              >
                                {t("garage.cancel")}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-primary"
                              onClick={() =>
                                setStockEdits((prev) => ({
                                  ...prev,
                                  [row.id]: String(row.stock),
                                }))
                              }
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              {t("vendor.edit")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </VendorLayout>
  );
}
