"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";
import { getBranches } from "@/services/branchService";
import type { DbBranch } from "@/types/database";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  Wrench,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Clock,
  GitBranch,
} from "lucide-react";

import en from "@/../messages/en.json";
import ar from "@/../messages/ar.json";

const allMessages = { en, ar } as Record<string, Record<string, unknown>>;
function resolveMsg(locale: string, key: string): string {
  const parts = key.split(".");
  let val: unknown = allMessages[locale] ?? allMessages.en;
  for (const p of parts) val = (val as Record<string, unknown>)?.[p];
  return typeof val === "string" ? val : key;
}

interface DbService {
  id: string;
  vendor_id: string;
  branch_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  duration_minutes: number | null;
  active: boolean;
  created_at: string;
}

const empty = {
  serviceKey: "",
  description: "",
  duration_minutes: "60",
  active: true,
  branch_id: "",
};

export default function VendorServicesPage() {
  const { vendor } = useAuth();
  const { t, locale } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  // Branch selector state
  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null); // null = "All"

  const [services, setServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });
    setServices((data ?? []) as unknown as DbService[]);
    setLoading(false);
  }, [vendor]);

  // Load branches once — prepend a synthetic "Main" entry from the vendor record
  useEffect(() => {
    if (!vendor) return;
    getBranches(vendor.id).then((b) => {
      // The main location lives on the vendor row itself, not in vendor_branches.
      // Build a synthetic DbBranch so it appears as an option everywhere.
      const mainSynthetic: DbBranch = {
        id: vendor.id, // use vendor.id as the branch id sentinel
        vendor_id: vendor.id,
        name: vendor.business_name ?? t("vendor.mainBranchLabel"),
        name_ar: vendor.business_name_ar ?? null,
        address: vendor.address ?? null,
        city: vendor.city ?? null,
        city_ar: null,
        governorate: null,
        latitude: null,
        longitude: null,
        maps_link: null,
        phone: vendor.phone ?? null,
        status: "active",
        is_main: true,
        created_at: "",
        updated_at: "",
      };
      const all = [mainSynthetic, ...b.filter((br) => !br.is_main)];
      setBranches(all);
      if (selectedBranch === null) setSelectedBranch(mainSynthetic.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof empty, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  // keep form branch_id in sync when branches load
  useEffect(() => {
    if (branches.length > 0 && !showForm) return;
    if (branches.length > 0 && !form.branch_id) {
      const main = branches.find((b) => b.is_main) ?? branches[0];
      setForm((f) => ({ ...f, branch_id: main.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  function openNew() {
    setForm({
      ...empty,
      branch_id:
        selectedBranch ??
        branches.find((b) => b.is_main)?.id ??
        branches[0]?.id ??
        "",
    });
    setEditId(null);
    setShowForm(true);
    setError(null);
  }
  function openEdit(s: DbService) {
    const allSlugs = SERVICE_CATEGORIES.flatMap((c) => c.services);
    const matched =
      allSlugs.find(
        (slug) =>
          resolveMsg("en", `home.services.${slug}`) === s.name ||
          resolveMsg("ar", `home.services.${slug}`) === s.name_ar,
      ) ?? "";
    // null branch_id means vendor-wide (main branch) — resolve to the synthetic main sentinel
    const mainId = branches.find((b) => b.is_main)?.id ?? branches[0]?.id ?? "";
    setForm({
      serviceKey: matched,
      description: s.description ?? "",
      duration_minutes: String(s.duration_minutes ?? 60),
      active: s.active,
      branch_id: s.branch_id ?? mainId,
    });
    setEditId(s.id);
    setShowForm(true);
    setError(null);
  }

  async function save() {
    if (!form.serviceKey) {
      setError(t("vendor.errSelectService"));
      return;
    }
    setSaving(true);
    setError(null);
    const basePayload = {
      name: resolveMsg("en", `home.services.${form.serviceKey}`),
      name_ar: resolveMsg("ar", `home.services.${form.serviceKey}`),
      description: form.description || null,
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes)
        : null,
      active: form.active,
      vendor_id: vendor!.id,
    };
    // The synthetic main branch uses vendor.id as its sentinel — store as null (vendor-wide).
    const resolvedBranchId = (id: string | null) =>
      !id || id === vendor!.id ? null : id;

    let err: { message: string } | null = null;
    if (editId) {
      const { error: e } = await supabase
        .from("services")
        .update({
          ...basePayload,
          branch_id:
            form.branch_id === "__all__"
              ? null
              : resolvedBranchId(form.branch_id),
        })
        .eq("id", editId);
      err = e;
    } else if (form.branch_id === "__all__") {
      // Insert one row for every real branch; main branch → null (vendor-wide)
      const rows = branches.map((b) => ({
        ...basePayload,
        branch_id: resolvedBranchId(b.id),
      }));
      const { error: e } = await supabase.from("services").insert(rows);
      err = e;
    } else {
      const { error: e } = await supabase.from("services").insert({
        ...basePayload,
        branch_id: resolvedBranchId(form.branch_id),
      });
      err = e;
    }
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setShowForm(false);
    load();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(t("vendor.deleteServiceConfirm"))) return;
    await supabase.from("services").delete().eq("id", id);
    load();
  }

  const mainBranchId = branches.find((b) => b.is_main)?.id;
  const filtered = services
    .filter((s) => {
      if (selectedBranch === null) return true;
      // Services with no branch_id belong to the main branch
      if (s.branch_id === null) return selectedBranch === mainBranchId;
      return s.branch_id === selectedBranch;
    })
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.name_ar ?? "").toLowerCase().includes(q)
      );
    });

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("vendor.servicesTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} {t("vendor.servicesOffered")}
            </p>
          </div>
          <Button onClick={openNew} className="gap-1.5">
            <PlusCircle className="h-4 w-4" /> {t("vendor.addService")}
          </Button>
        </div>

        {/* Branch selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              Branch:
            </span>
            <Button
              size="sm"
              variant={selectedBranch === null ? "default" : "outline"}
              onClick={() => setSelectedBranch(null)}
            >
              All
            </Button>
            {branches.map((b) => (
              <Button
                key={b.id}
                size="sm"
                variant={selectedBranch === b.id ? "default" : "outline"}
                onClick={() => setSelectedBranch(b.id)}
              >
                {b.name}
                {b.is_main && (
                  <span className="ml-1 text-xs opacity-60">(Main)</span>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: t("vendor.totalServices"), value: filtered.length },
            {
              label: t("vendor.active"),
              value: filtered.filter((s) => s.active).length,
            },
            {
              label: t("vendor.inactive"),
              value: filtered.filter((s) => !s.active).length,
            },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-black mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("vendor.searchServices")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">{t("vendor.noServices")}</p>
                <Button className="mt-4" onClick={openNew}>
                  {t("vendor.addFirstService")}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("vendor.service")}</TableHead>
                    <TableHead>{t("vendor.duration")}</TableHead>
                    <TableHead>{t("vendor.status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-semibold text-sm">
                          {locale === "ar"
                            ? s.name_ar ||
                              (() => {
                                const allSlugs = SERVICE_CATEGORIES.flatMap(
                                  (c) => c.services,
                                );
                                const slug = allSlugs.find(
                                  (sl) =>
                                    resolveMsg("en", `home.services.${sl}`) ===
                                    s.name,
                                );
                                return slug
                                  ? resolveMsg("ar", `home.services.${slug}`)
                                  : s.name;
                              })()
                            : s.name}
                        </p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {s.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.duration_minutes ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {s.duration_minutes >= 60
                              ? `${Math.floor(s.duration_minutes / 60)}h ${s.duration_minutes % 60 ? `${s.duration_minutes % 60}m` : ""}`
                              : `${s.duration_minutes}m`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.active ? "outline" : "secondary"}
                          className={
                            s.active
                              ? "border-green-200 text-green-700 bg-green-50"
                              : ""
                          }
                        >
                          {s.active ? t("vendor.active") : t("vendor.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? t("vendor.editService") : t("vendor.addService")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <select
                  value={form.branch_id ?? ""}
                  onChange={(e) => set("branch_id", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="__all__">— All Branches —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.is_main ? " (Main)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("vendor.serviceName")} *</Label>
              <select
                value={form.serviceKey}
                onChange={(e) => set("serviceKey", e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">— {t("vendor.selectService")} —</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <optgroup
                    key={cat.key}
                    label={t(`home.serviceCategories.${cat.key}`)}
                  >
                    {cat.services.map((slug) => (
                      <option key={slug} value={slug}>
                        {t(`home.services.${slug}`)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("vendor.durationMinutes")}</Label>
              <Input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("vendor.description")}</Label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder={t("vendor.serviceDescPlaceholder")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => set("active", v)}
                id="svc-active"
              />
              <Label htmlFor="svc-active">{t("vendor.activeForBooking")}</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                {t("garage.cancel")}
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving
                  ? t("vendor.saving")
                  : editId
                    ? t("vendor.saveChanges")
                    : t("vendor.addService")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
