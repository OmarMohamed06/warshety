"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Package,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function VendorOrdersPage() {
  const { vendor, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const STATUSES: { value: OrderStatus | "all"; label: string }[] = [
    { value: "all", label: t("vendor.allStatuses") },
    { value: "pending", label: t("vendor.statusLabels.pending") },
    { value: "paid", label: t("vendor.statusLabels.paid") },
    { value: "shipped", label: t("vendor.statusLabels.shipped") },
    { value: "completed", label: t("vendor.statusLabels.completed") },
    { value: "cancelled", label: t("vendor.statusLabels.cancelled") },
  ];

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("order_items")
        .select(
          "*, order:orders(id,status,created_at,total_amount,delivery_address,payment_method,user:users(full_name,email,phone))",
        )
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      // Group by order
      const map = new Map<string, any>();
      for (const item of (data ?? []) as any[]) {
        const oid = item.order?.id;
        if (!oid) continue;
        if (!map.has(oid)) map.set(oid, { ...item.order, items: [] });
        map.get(oid).items.push(item);
      }
      setOrders([...map.values()]);
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!authLoading && !vendor) setLoading(false);
  }, [authLoading, vendor]);

  const filtered = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.id?.toLowerCase().includes(q) ||
        o.user?.full_name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("vendor.ordersTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {orders.length} {t("vendor.ordersTitle").toLowerCase()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("vendor.refresh")}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATUSES.filter((s) => s.value !== "all").map(({ value, label }) => (
            <Card
              key={value}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setFilter(value as OrderStatus)}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-black mt-0.5">
                  {orders.filter((o) => o.status === value).length}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("vendor.searchOrderPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(({ value, label }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filter === value ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setFilter(value as OrderStatus | "all")}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">{t("vendor.noOrders")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.orderId")}</TableHead>
                    <TableHead>{t("vendor.customer")}</TableHead>
                    <TableHead>{t("vendor.items")}</TableHead>
                    <TableHead>{t("vendor.amount")}</TableHead>
                    <TableHead>{t("vendor.date")}</TableHead>
                    <TableHead>{t("vendor.status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        #{o.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {o.user?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.user?.phone ?? o.user?.email ?? ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {o.items?.length ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {o.total_amount
                          ? `EGP ${o.total_amount.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[o.status] ?? "bg-muted text-foreground"}`}
                        >
                          {t(`vendor.statusLabels.${o.status}`) || o.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelected(o)}
                        >
                          {t("admin.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("vendor.orderDialogTitle")} #{selected?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CLS[selected.status] ?? "bg-muted"}`}
                >
                  {t(`vendor.statusLabels.${selected.status}`) ||
                    selected.status}
                </span>
                <span className="text-muted-foreground">
                  {selected.created_at
                    ? new Date(selected.created_at).toLocaleString()
                    : ""}
                </span>
              </div>

              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-bold">{t("vendor.customer")}</p>
                <p>{selected.user?.full_name ?? "—"}</p>
                <p className="text-muted-foreground">
                  {selected.user?.phone ?? selected.user?.email ?? ""}
                </p>
              </div>

              {selected.delivery_address && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-bold">{t("checkout.deliveryAddress")}</p>
                  <p className="text-muted-foreground">
                    {selected.delivery_address}
                  </p>
                </div>
              )}

              <div className="rounded-lg border divide-y">
                {(selected.items ?? []).map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.product_name ?? item.part_id ?? "Item"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("vendor.qty")}: {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      EGP {(item.quantity * item.unit_price).toLocaleString()}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 font-bold">
                  <span>{t("vendor.totalLabel")}</span>
                  <span>
                    EGP {selected.total_amount?.toLocaleString() ?? "—"}
                  </span>
                </div>
              </div>

              <Button className="w-full" onClick={() => setSelected(null)}>
                {t("garage.cancel")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
