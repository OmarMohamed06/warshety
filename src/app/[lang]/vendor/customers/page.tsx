"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Search,
  Phone,
  Mail,
  TrendingUp,
  CalendarDays,
  ShoppingBag,
} from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  total_spent: number;
  visit_count: number;
  last_activity: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-black">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorCustomersPage() {
  const { vendor, vendorType, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const fn =
        vendorType === "service_center"
          ? "get_vendor_customers_service"
          : "get_vendor_customers_parts";

      const { data, error } = await supabase.rpc(fn, {
        p_vendor_id: vendor.id,
      });

      if (!error && data) {
        setCustomers(
          (data as any[]).map((r) => ({
            id: r.id,
            full_name: r.full_name ?? "Unknown",
            email: r.email ?? "",
            phone: r.phone ?? null,
            visit_count: Number(r.visit_count) || 0,
            total_spent: parseFloat(String(r.total_spent ?? 0)) || 0,
            last_activity: r.last_activity ?? "",
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [vendor, vendorType, supabase]);

  useEffect(() => {
    if (!authLoading && !vendor) setLoading(false);
    else if (vendor) load();
  }, [authLoading, vendor, load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q),
    );
  }, [customers, search]);

  const totalRevenue = useMemo(
    () => customers.reduce((s, c) => s + c.total_spent, 0),
    [customers],
  );

  const isService = vendorType === "service_center";
  const activityLabel = isService ? "Bookings" : "Orders";

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {t("vendor.customersTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("vendor.customersSubtitle")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label={t("vendor.totalCustomers")}
            value={loading ? "—" : customers.length}
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label={t("vendor.totalRevenue")}
            value={
              loading
                ? "—"
                : `EGP ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            }
            loading={loading}
          />
          <StatCard
            icon={isService ? CalendarDays : ShoppingBag}
            label={`${t("vendor.totalLabel").replace(":", "")} ${activityLabel}`}
            value={
              loading ? "—" : customers.reduce((s, c) => s + c.visit_count, 0)
            }
            loading={loading}
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base font-bold">
                {t("vendor.customerList")}
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("vendor.searchCustomers")}
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">
                  {search
                    ? t("vendor.noCustomersSearch")
                    : t("vendor.noCustomers")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.customer")}</TableHead>
                    <TableHead>{t("vendor.contact")}</TableHead>
                    <TableHead className="text-center">
                      {activityLabel}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("vendor.totalSpent")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("vendor.lastActivity")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const initials = c.full_name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-sm">
                              {c.full_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {c.email || "—"}
                            </span>
                            {c.phone && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {c.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-bold">
                            {c.visit_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm">
                          EGP{" "}
                          {c.total_spent.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {c.last_activity
                            ? new Date(c.last_activity).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
