"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  DollarSign,
  Package,
  ShoppingCart,
  Star,
  Users,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Wrench,
  Boxes,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-black">{value}</p>
            )}
            {loading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {trend === "down" && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {sub}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Revenue chart placeholder ─────────────────────────────────────────────────

function RevenueChart({ data }: { data: { day: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-0.5 group"
        >
          <div
            className="w-full rounded-t bg-primary/20 group-hover:bg-primary/40 transition-colors"
            style={{ height: `${(d.amount / max) * 100}%`, minHeight: "2px" }}
            title={`${d.day}: EGP ${d.amount.toLocaleString()}`}
          />
        </div>
      ))}
    </div>
  );
}

// ── STATUS maps ───────────────────────────────────────────────────────────────

const BOOKING_STATUS_CLS: Record<string, string> = {
  booked: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_parts: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ORDER_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

/** Parse a Postgres numeric/text value to a JS number safely */
const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? 0));
  return isNaN(x) ? 0 : x;
};

export default function VendorDashboardPage() {
  const { vendor, vendorType, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState({
    revenue: 0,
    ordersToday: 0,
    ordersMonth: 0,
    rating: 0,
    customers: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ day: string; amount: number }[]>(
    [],
  );
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFees, setPendingFees] = useState(0);
  // For service centers: fee per booking (from vendor_billing_settings)
  const [bookingFee, setBookingFee] = useState(75);

  // When auth finishes loading but no vendor exists, stop the skeleton
  useEffect(() => {
    if (!authLoading && !vendor) setLoading(false);
  }, [authLoading, vendor]);

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      // Use local date to avoid UTC-shift (Egypt is UTC+2/+3)
      const now = new Date();
      const pad = (x: number) => String(x).padStart(2, "0");
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const firstOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

      if (vendorType === "service_center") {
        // All bookings queries + vendor rating + recent bookings in one round-trip
        const [
          { data: all },
          { data: today },
          { data: month },
          { data: vendorData },
          { data: recentData },
        ] = await Promise.all([
          supabase
            .from("bookings")
            .select("id,total_price,user_id,status,booking_date")
            .eq("vendor_id", vendor.id),
          supabase
            .from("bookings")
            .select("id")
            .eq("vendor_id", vendor.id)
            .eq("booking_date", todayStr),
          supabase
            .from("bookings")
            .select("id,total_price")
            .eq("vendor_id", vendor.id)
            .gte("booking_date", firstOfMonth),
          supabase
            .from("vendors")
            .select("rating")
            .eq("id", vendor.id)
            .single(),
          supabase
            .from("bookings")
            .select(
              "id,display_id,booking_date,booking_time,status,total_price,service_key,booking_type,user:users!left(full_name)",
            )
            .eq("vendor_id", vendor.id)
            .order("booking_date", { ascending: false })
            .limit(8),
        ]);
        const revenue = (all ?? []).reduce(
          (s: number, b: any) => s + n(b.total_price),
          0,
        );
        const customers = new Set((all ?? []).map((b: any) => b.user_id)).size;
        const monthRev = (month ?? []).reduce(
          (s: number, b: any) => s + n(b.total_price),
          0,
        );

        // Chart: last 14 days
        const days: { day: string; amount: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().split("T")[0];
          const dayTotal = (all ?? [])
            .filter((b: any) => b.booking_date === ds)
            .reduce((s: number, b: any) => s + n(b.total_price), 0);
          days.push({
            day: d.toLocaleDateString("en", { weekday: "short" }),
            amount: dayTotal,
          });
        }

        // Current month's projected bill = bookings this month × fee per booking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data: billingSettings } = await db
          .from("vendor_billing_settings")
          .select("booking_fee")
          .eq("vendor_id", vendor.id)
          .maybeSingle();
        const fee = billingSettings?.booking_fee ?? 75;
        setBookingFee(fee);
        // (month ?? []).length is the booking count for this calendar month
        setPendingFees((month ?? []).length * fee);

        setStats({
          revenue: monthRev,
          ordersToday: (today ?? []).length,
          ordersMonth: (month ?? []).length,
          rating: n(vendorData?.rating), // parse numeric string from Postgres
          customers,
        });
        setRecent(recentData ?? []);
        setChartData(days);
      } else {
        // Parts seller: fetch order_items, low stock and vendor rating in parallel
        const [{ data: items }, { data: lowStockData }, { data: vendorData }] =
          await Promise.all([
            supabase
              .from("order_items")
              .select(
                "quantity,unit_price,order:orders(status,created_at,user_id)",
              )
              .eq("vendor_id", vendor.id),
            supabase
              .from("products")
              .select("id,name,stock,price")
              .eq("vendor_id", vendor.id)
              .lt("stock", 5)
              .order("stock")
              .limit(5),
            supabase
              .from("vendors")
              .select("rating")
              .eq("id", vendor.id)
              .single(),
          ]);

        const all = items ?? [];
        const revenue = all.reduce(
          (s: number, i: any) => s + n(i.quantity) * n(i.unit_price),
          0,
        );
        const customers = new Set(
          all.map((i: any) => i.order?.user_id).filter(Boolean),
        ).size;

        const todayItems = all.filter((i: any) =>
          i.order?.created_at?.startsWith(todayStr),
        );
        const monthItems = all.filter(
          (i: any) => i.order?.created_at >= firstOfMonth,
        );

        // Recent orders
        const { data: recentOrders } = await supabase
          .from("orders")
          .select(
            "id,display_id,status,created_at,total_amount,user:users(full_name,email)",
          )
          .in(
            "id",
            [
              ...new Set(all.map((i: any) => i.order?.id).filter(Boolean)),
            ].slice(0, 8),
          );

        // Chart
        const days: { day: string; amount: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().split("T")[0];
          const dayTotal = all
            .filter((i: any) => i.order?.created_at?.startsWith(ds))
            .reduce(
              (s: number, item: any) =>
                s + n(item.quantity) * n(item.unit_price),
              0,
            );
          days.push({
            day: d.toLocaleDateString("en", { weekday: "short" }),
            amount: dayTotal,
          });
        }

        // Pending commission for this parts seller
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data: psTx } = await db
          .from("parts_seller_transactions")
          .select("platform_share")
          .eq("vendor_id", vendor.id)
          .eq("payment_status", "pending");
        const psPendingTotal = (psTx ?? []).reduce(
          (s: number, r: any) => s + n(r.platform_share),
          0,
        );
        setPendingFees(psPendingTotal);

        setStats({
          revenue,
          ordersToday: todayItems.length,
          ordersMonth: monthItems.length,
          rating: n(vendorData?.rating), // parse numeric string from Postgres
          customers,
        });
        setRecent(recentOrders ?? []);
        setLowStock(lowStockData ?? []);
        setChartData(days);
      }
    } catch {
      // silently degrade — partial data already set above
    } finally {
      setLoading(false);
    }
  }, [vendor, vendorType]);

  useEffect(() => {
    load();
  }, [load]);

  const isService = vendorType === "service_center";

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("vendor.dashboard")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {vendor?.business_name ?? t("vendor.businessOverview")}
            </p>
          </div>
          <Button asChild>
            <Link href={isService ? "/vendor/services" : "/vendor/products"}>
              <PlusCircle className="h-4 w-4 mr-2" />
              {isService ? t("vendor.newService") : t("vendor.addProduct")}
            </Link>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {!isService && (
            <StatCard
              title={t("vendor.revenueThisMonth")}
              value={`EGP ${stats.revenue.toLocaleString()}`}
              sub={t("vendor.fromCompleted")}
              icon={DollarSign}
              trend="up"
              loading={loading}
            />
          )}
          <StatCard
            title={
              isService ? t("vendor.bookingsToday") : t("vendor.ordersToday")
            }
            value={stats.ordersToday}
            sub={t("vendor.sinceMidnight")}
            icon={isService ? CalendarDays : ShoppingCart}
            trend="neutral"
            loading={loading}
          />
          <StatCard
            title={
              isService
                ? t("vendor.bookingsThisMonth")
                : t("vendor.ordersThisMonth")
            }
            value={stats.ordersMonth}
            sub={t("vendor.thisCalendarMonth")}
            icon={isService ? Clock : Boxes}
            trend="up"
            loading={loading}
          />
          <StatCard
            title={t("vendor.avgRating")}
            value={stats.rating ? stats.rating.toFixed(1) : "—"}
            sub={t("vendor.fromReviews")}
            icon={Star}
            trend="neutral"
            loading={loading}
          />
          {/* Fees / Billing status card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">
                    {isService
                      ? t("vendor.feesThisMonthBill")
                      : t("vendor.feesStatus")}
                  </p>
                  {loading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    <p
                      className={`text-2xl font-black ${
                        isService
                          ? "text-amber-600"
                          : pendingFees > 0
                            ? ""
                            : "text-green-600"
                      }`}
                    >
                      {isService || pendingFees > 0
                        ? `EGP ${pendingFees.toLocaleString()}`
                        : t("vendor.feesAllClear")}
                    </p>
                  )}
                  {loading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : isService ? (
                    // SC: show the per-booking breakdown
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {stats.ordersMonth} {t("vendor.feesBookingsTimes")} EGP{" "}
                      {bookingFee}
                    </span>
                  ) : (
                    // PS: show paid/pending badge
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        pendingFees > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {pendingFees > 0
                        ? t("vendor.feesPending")
                        : t("vendor.feesAllClear")}
                    </span>
                  )}
                  {!loading && (
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      {t("vendor.feesMonthlySettlement")}
                    </p>
                  )}
                </div>
                <div
                  className={`rounded-xl p-3 ${
                    isService
                      ? "bg-amber-100"
                      : pendingFees > 0
                        ? "bg-amber-100"
                        : "bg-green-100"
                  }`}
                >
                  <DollarSign
                    className={`h-5 w-5 ${
                      isService
                        ? "text-amber-600"
                        : pendingFees > 0
                          ? "text-amber-600"
                          : "text-green-600"
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue chart — parts sellers only */}
          {!isService && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">
                    {t("vendor.revenueLast14Days")}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    EGP
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <RevenueChart data={chartData} />
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {t("vendor.totalLabel")}{" "}
                    <span className="font-bold text-foreground">
                      EGP{" "}
                      {chartData
                        .reduce((s, d) => s + d.amount, 0)
                        .toLocaleString()}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions / Low stock */}
          <Card className={isService ? "lg:col-span-3" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">
                {isService
                  ? t("vendor.quickActions")
                  : lowStock.length > 0
                    ? t("vendor.lowStockAlert")
                    : t("vendor.quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!isService && lowStock.length > 0 ? (
                <>
                  {lowStock.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm flex-1 truncate">{p.name}</span>
                      <Badge
                        variant="outline"
                        className="text-amber-600 border-amber-200 bg-amber-50 text-[10px]"
                      >
                        {p.stock} {t("vendor.left")}
                      </Badge>
                    </div>
                  ))}
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    asChild
                  >
                    <Link href="/vendor/inventory">
                      <Boxes className="h-3.5 w-3.5" />{" "}
                      {t("vendor.viewInventory")}
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  {(isService
                    ? [
                        {
                          href: "/vendor/bookings",
                          icon: CalendarDays,
                          label: t("vendor.viewAllBookings"),
                        },
                        {
                          href: "/vendor/services",
                          icon: Wrench,
                          label: t("vendor.manageServices"),
                        },
                        {
                          href: "/vendor/calendar",
                          icon: CalendarDays,
                          label: t("vendor.openCalendar"),
                        },
                        {
                          href: "/vendor/customers",
                          icon: Users,
                          label: t("vendor.viewCustomers"),
                        },
                      ]
                    : [
                        {
                          href: "/vendor/products",
                          icon: Package,
                          label: t("vendor.manageProducts"),
                        },
                        {
                          href: "/vendor/orders",
                          icon: ShoppingCart,
                          label: t("vendor.viewOrders"),
                        },
                        {
                          href: "/vendor/inventory",
                          icon: Boxes,
                          label: t("vendor.checkInventory"),
                        },
                        {
                          href: "/vendor/customers",
                          icon: Users,
                          label: t("vendor.viewCustomers"),
                        },
                      ]
                  ).map(({ href, icon: Icon, label }) => (
                    <Button
                      key={href}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <Link href={href}>
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </Link>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">
                {isService
                  ? t("vendor.recentBookings")
                  : t("vendor.recentOrders")}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                asChild
              >
                <Link href={isService ? "/vendor/bookings" : "/vendor/orders"}>
                  {t("vendor.viewAll")} <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">{t("vendor.noActivity")}</p>
                <p className="text-sm mt-1">
                  {isService
                    ? t("vendor.bookingsWillAppear")
                    : t("vendor.ordersWillAppear")}
                </p>
              </div>
            ) : isService ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.orderId")}</TableHead>
                    <TableHead>{t("vendor.customer")}</TableHead>
                    <TableHead>{t("vendor.service")}</TableHead>
                    <TableHead>{t("vendor.date")}</TableHead>
                    <TableHead>{t("vendor.amount")}</TableHead>
                    <TableHead>{t("vendor.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">
                        #{b.display_id ?? b.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {b.user?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.service_key
                          ? t(`home.services.${b.service_key}`) !== `home.services.${b.service_key}`
                            ? t(`home.services.${b.service_key}`)
                            : b.service_key.replace(/-/g, " ")
                          : b.booking_type === "routine_maintenance"
                            ? t("vendor.routineMaintenance")
                            : b.booking_type === "inspection"
                              ? t("vendor.inspection")
                              : (b.booking_type ?? "—")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {b.booking_date}
                      </TableCell>
                      <TableCell>
                        {b.total_price
                          ? `EGP ${b.total_price.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BOOKING_STATUS_CLS[b.status] ?? "bg-muted text-foreground"}`}
                        >
                          {t(`vendor.statusLabels.${b.status}`) ||
                            b.status?.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.orderId")}</TableHead>
                    <TableHead>{t("vendor.customer")}</TableHead>
                    <TableHead>{t("vendor.amount")}</TableHead>
                    <TableHead>{t("vendor.date")}</TableHead>
                    <TableHead>{t("vendor.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        #{o.display_id ?? o.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {o.user?.full_name ?? o.user?.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        {o.total_amount
                          ? `EGP ${o.total_amount.toLocaleString()}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ORDER_STATUS_CLS[o.status] ?? "bg-muted text-foreground"}`}
                        >
                          {t(`vendor.statusLabels.${o.status}`) || o.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
