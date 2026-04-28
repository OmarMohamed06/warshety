"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchWorkingHours,
  saveBranchWorkingHours,
  getOrCreateMainBranch,
  type BranchFormData,
} from "@/services/branchService";
import {
  DEFAULT_WORKING_HOURS,
  getWorkingHours,
  saveWorkingHours,
  type WorkingHours,
} from "@/services/availabilityService";
import type { DbBranch } from "@/types/database";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GitBranch,
  PlusCircle,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { LocaleLink } from "@/components/ui/locale-link";

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: BranchFormData = {
  name: "",
  name_ar: "",
  address: "",
  city: "",
  city_ar: "",
  phone: "",
  status: "active",
  is_main: false,
  maps_link: "",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Branch Card ────────────────────────────────────────────────────────────────

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onManageHours,
}: {
  branch: DbBranch;
  onEdit: (b: DbBranch) => void;
  onDelete: (b: DbBranch) => void;
  onManageHours: (b: DbBranch) => void;
}) {
  const { t } = useLanguage();
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-bold truncate">{branch.name}</p>
              {branch.name_ar && (
                <p className="text-xs text-muted-foreground">
                  {branch.name_ar}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {branch.is_main && (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                {t("vendor.mainBadge")}
              </Badge>
            )}
            <Badge
              className={
                branch.status === "active"
                  ? "text-xs bg-green-100 text-green-700 border-green-200"
                  : "text-xs bg-slate-100 text-slate-600 border-slate-200"
              }
            >
              {branch.status === "active"
                ? t("vendor.activeStat")
                : t("vendor.inactiveStat")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(branch.address || branch.city) && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {[branch.address, branch.city].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{branch.phone}</span>
          </div>
        )}
        <Separator />
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onManageHours(branch)}
          >
            <Clock className="h-3.5 w-3.5" />
            {t("vendor.workingHours")}
          </Button>
          <LocaleLink
            href={`/vendor/branches/${branch.id}/managers`}
            className="inline-flex items-center gap-1.5 text-xs h-8 rounded-md border border-input bg-background px-3 py-2 font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Users className="h-3.5 w-3.5" />
            {t("vendor.managers")}
          </LocaleLink>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onEdit(branch)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("vendor.edit")}
          </Button>
          {!branch.is_main && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:border-red-300"
              onClick={() => onDelete(branch)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("vendor.delete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Working Hours Dialog ───────────────────────────────────────────────────────

function WorkingHoursDialog({
  branch,
  open,
  onClose,
}: {
  branch: DbBranch | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_WORKING_HOURS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!branch || !open) return;
    setLoading(true);
    getSaved();
    async function getSaved() {
      const h = await getBranchWorkingHours(branch!.id);
      setHours(h);
      setLoading(false);
    }
  }, [branch, open]);

  const setDay = (
    idx: number,
    key: keyof WorkingHours,
    val: string | boolean,
  ) => {
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [key]: val } : h)),
    );
  };

  const handleSave = async () => {
    if (!branch) return;
    setSaving(true);
    const { error } = await saveBranchWorkingHours(branch.id, hours);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("vendor.workingHours")}
          </DialogTitle>
          <DialogDescription>{branch?.name}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {hours.map((h, i) => (
                <div
                  key={h.dayOfWeek}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    h.isOpen ? "bg-background" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="w-10 text-sm font-semibold text-center">
                    {DAY_NAMES[h.dayOfWeek]}
                  </div>
                  <Switch
                    checked={h.isOpen}
                    onCheckedChange={(v) => setDay(i, "isOpen", v)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={h.open}
                      disabled={!h.isOpen}
                      onChange={(e) => setDay(i, "open", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={h.close}
                      disabled={!h.isOpen}
                      onChange={(e) => setDay(i, "close", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                  </div>
                  {!h.isOpen && (
                    <span className="text-xs text-muted-foreground">
                      {t("vendor.closedDay")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("vendor.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
            {saved ? t("vendor.savedSuccess2") : t("vendor.saveHoursBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Location Working Hours Dialog ───────────────────────────────────────

function MainWorkingHoursDialog({
  vendorId,
  vendorName,
  open,
  onClose,
}: {
  vendorId: string;
  vendorName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_WORKING_HOURS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getWorkingHours(vendorId).then((h) => {
      setHours(h);
      setLoading(false);
    });
  }, [open, vendorId]);

  const setDay = (
    idx: number,
    key: keyof WorkingHours,
    val: string | boolean,
  ) =>
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [key]: val } : h)),
    );

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveWorkingHours(vendorId, hours);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("vendor.workingHours")}
          </DialogTitle>
          <DialogDescription>
            {vendorName} &middot; {t("vendor.mainLocation")}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {hours.map((h, i) => (
                <div
                  key={h.dayOfWeek}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    h.isOpen ? "bg-background" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="w-10 text-sm font-semibold text-center">
                    {DAY_NAMES[h.dayOfWeek]}
                  </div>
                  <Switch
                    checked={h.isOpen}
                    onCheckedChange={(v) => setDay(i, "isOpen", v)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={h.open}
                      disabled={!h.isOpen}
                      onChange={(e) => setDay(i, "open", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={h.close}
                      disabled={!h.isOpen}
                      onChange={(e) => setDay(i, "close", e.target.value)}
                      className="h-8 text-xs w-28"
                    />
                  </div>
                  {!h.isOpen && (
                    <span className="text-xs text-muted-foreground">
                      {t("vendor.closedDay")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pt-3 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("vendor.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : null}
            {saved ? t("vendor.savedSuccess2") : t("vendor.saveHoursBtn")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VendorBranchesPage() {
  const { vendor, vendorType } = useAuth();
  const { t } = useLanguage();

  const [branches, setBranches] = useState<DbBranch[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch form state
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState<DbBranch | null>(null);
  const [form, setForm] = useState<BranchFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Working hours dialog
  const [whBranch, setWhBranch] = useState<DbBranch | null>(null);
  // Main location working hours
  const [showMainWH, setShowMainWH] = useState(false);
  // Main branch ID (for managers link)
  const [mainBranchId, setMainBranchId] = useState<string | null>(null);

  // Delete confirmation
  const [deleting, setDeleting] = useState<DbBranch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    const [data, { id }] = await Promise.all([
      getBranches(vendor.id),
      getOrCreateMainBranch(vendor.id, vendor.business_name),
    ]);
    setBranches(data);
    setMainBranchId(id);
    setLoading(false);
  }, [vendor]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditBranch(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(b: DbBranch) {
    setForm({
      name: b.name,
      name_ar: b.name_ar ?? "",
      address: b.address ?? "",
      city: b.city ?? "",
      city_ar: b.city_ar ?? "",
      phone: b.phone ?? "",
      status: b.status,
      is_main: b.is_main,
      maps_link: b.maps_link ?? "",
    });
    setEditBranch(b);
    setFormError(null);
    setShowForm(true);
  }

  const set = (k: keyof BranchFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Branch name is required.");
      return;
    }
    if (!vendor) return;
    setSaving(true);
    setFormError(null);

    const payload: BranchFormData = {
      name: form.name.trim(),
      name_ar: form.name_ar?.trim() || undefined,
      address: form.address?.trim() || undefined,
      city: form.city?.trim() || undefined,
      city_ar: form.city_ar?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      status: form.status,
      is_main: form.is_main,
      maps_link: form.maps_link?.trim() || null,
    };

    let error: string | null = null;
    if (editBranch) {
      ({ error } = await updateBranch(editBranch.id, payload));
    } else {
      ({ error } = await createBranch(vendor.id, payload));
    }

    if (error) {
      setFormError(error);
      setSaving(false);
      return;
    }

    setShowForm(false);
    load();
    setSaving(false);
  }

  async function handleDelete(b: DbBranch) {
    setDeleteLoading(true);
    await deleteBranch(b.id);
    setDeleting(null);
    setDeleteLoading(false);
    load();
  }

  if (vendorType && vendorType !== "service_center") {
    return (
      <VendorLayout>
        <div className="text-center py-20 text-muted-foreground">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">
            {t("vendor.branchesOnlyServiceCenters")}
          </p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{t("vendor.branchesTitle")}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("vendor.branchesSubtitle")}
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <PlusCircle className="h-4 w-4" />
            {t("vendor.addBranch")}
          </Button>
        </div>

        {/* Branch Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* ── Main location card (always first, from vendor record) ── */}
            {vendor && (
              <Card className="relative border-primary/30 bg-primary/[0.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {vendor.business_name}
                        </p>
                        {vendor.business_name_ar && (
                          <p className="text-xs text-muted-foreground">
                            {vendor.business_name_ar}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        {t("vendor.mainBadge")}
                      </Badge>
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                        {t("vendor.activeStat")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(vendor.address || vendor.city) && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        {[vendor.address, vendor.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => setShowMainWH(true)}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {t("vendor.workingHours")}
                    </Button>
                    {mainBranchId && (
                      <LocaleLink
                        href={`/vendor/branches/${mainBranchId}/managers`}
                        className="inline-flex items-center gap-1.5 text-xs h-8 rounded-md border border-input bg-background px-3 py-2 font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {t("vendor.managers")}
                      </LocaleLink>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t("vendor.editDetailsInSettings")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Extra branches from vendor_branches ── */}
            {branches
              .filter((b) => !b.is_main)
              .map((b) => (
                <BranchCard
                  key={b.id}
                  branch={b}
                  onEdit={openEdit}
                  onDelete={(br) => setDeleting(br)}
                  onManageHours={(br) => setWhBranch(br)}
                />
              ))}

            {/* ── Empty prompt when no extra branches exist ── */}
            {branches.filter((b) => !b.is_main).length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <GitBranch className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-semibold text-muted-foreground text-sm">
                    {t("vendor.noBranchesYet")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("vendor.noBranchesHint")}
                  </p>
                  <Button className="mt-3 gap-2" size="sm" onClick={openNew}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    {t("vendor.addBranch")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Branch Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="w-full max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editBranch
                ? t("vendor.editBranchTitle")
                : t("vendor.addNewBranch")}
            </DialogTitle>
            <DialogDescription>
              {editBranch
                ? t("vendor.editBranchDesc")
                : t("vendor.addBranchDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-name">{t("vendor.branchNameEn")}</Label>
                <Input
                  id="b-name"
                  placeholder={t("vendor.branchNameEnPH")}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-name-ar">{t("vendor.branchNameAr")}</Label>
                <Input
                  id="b-name-ar"
                  placeholder="اسم الفرع"
                  dir="rtl"
                  value={form.name_ar}
                  onChange={(e) => set("name_ar", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-address">{t("vendor.address")}</Label>
              <Input
                id="b-address"
                placeholder="Street address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-city">{t("vendor.city")}</Label>
                <Input
                  id="b-city"
                  placeholder="Cairo"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-city-ar">{t("vendor.cityAr")}</Label>
                <Input
                  id="b-city-ar"
                  placeholder="القاهرة"
                  dir="rtl"
                  value={form.city_ar}
                  onChange={(e) => set("city_ar", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-phone">{t("vendor.phone")}</Label>
              <Input
                id="b-phone"
                placeholder="01X XXXX XXXX"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-maps" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {t("vendor.mapsLink")}
              </Label>
              <Input
                id="b-maps"
                placeholder="https://maps.google.com/?q=30.06,31.22"
                value={form.maps_link ?? ""}
                onChange={(e) => set("maps_link", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("vendor.mapsLinkHint")}
                {form.maps_link ? t("vendor.mapsLinkSaved") : ""}
              </p>
            </div>

            <div className="flex gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="b-active"
                  checked={form.status === "active"}
                  onCheckedChange={(v) =>
                    set("status", v ? "active" : "inactive")
                  }
                />
                <Label htmlFor="b-active" className="cursor-pointer">
                  {t("vendor.activeStat")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="b-main"
                  checked={!!form.is_main}
                  onCheckedChange={(v) => set("is_main", v)}
                />
                <Label htmlFor="b-main" className="cursor-pointer">
                  {t("vendor.mainBranchLabel")}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t("vendor.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editBranch ? t("vendor.saveChanges") : t("vendor.createBranch")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Working Hours Dialog */}
      <WorkingHoursDialog
        branch={whBranch}
        open={!!whBranch}
        onClose={() => setWhBranch(null)}
      />

      {/* Main Location Working Hours Dialog */}
      {vendor && (
        <MainWorkingHoursDialog
          vendorId={vendor.id}
          vendorName={vendor.business_name}
          open={showMainWH}
          onClose={() => setShowMainWH(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="w-full max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("vendor.deleteBranch")}</DialogTitle>
            <DialogDescription>
              {t("vendor.deleteBranchConfirm")}{" "}
              <strong>{deleting?.name}</strong>?{" "}
              {t("vendor.deleteBranchWarning")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t("vendor.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => deleting && handleDelete(deleting)}
              className="gap-2"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("vendor.deleteBranchBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
