"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gift,
  PlusCircle,
  Pencil,
  Trash2,
  Star,
  Wrench,
  Droplets,
  ShieldCheck,
  Package,
  Layers,
  ImageIcon,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Upload,
  Loader2,
  X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type RewardCategory =
  | "wash"
  | "detailing"
  | "protection"
  | "inspection"
  | "parts"
  | "other";
type RewardType = "service_reward";
type ValueType = "fixed" | "percent";

interface Reward {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  points_required: number;
  category: RewardCategory;
  type: RewardType;
  image_url: string | null;
  value: number | null;
  value_type: ValueType;
  promo_code: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_META: Record<
  RewardCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  wash: {
    label: "Wash",
    icon: <Droplets size={14} />,
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  detailing: {
    label: "Detailing",
    icon: <Star size={14} />,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  protection: {
    label: "Protection",
    icon: <ShieldCheck size={14} />,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  inspection: {
    label: "Inspection",
    icon: <Wrench size={14} />,
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  parts: {
    label: "Parts",
    icon: <Package size={14} />,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  other: {
    label: "Other",
    icon: <Layers size={14} />,
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const EMPTY_FORM = {
  title: "",
  title_ar: "",
  description: "",
  description_ar: "",
  points_required: "",
  category: "other" as RewardCategory,
  image_url: "",
  value: "",
  value_type: "fixed" as ValueType,
  is_active: true,
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminRewardsPage() {
  const { isRTL } = useLanguage();
  const supabase = createClient();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<RewardCategory | "all">(
    "all",
  );
  const [filterType, setFilterType] = useState<RewardType | "all">("all");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rewards")
      .select("*")
      .order("points_required", { ascending: true });
    setRewards((data as unknown as Reward[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // ── Dialog open/close ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `rewards/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("rewards")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) {
      setError(`Image upload failed: ${uploadErr.message}`);
      setUploadingImage(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("rewards")
      .getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploadingImage(false);
  }

  function openEdit(r: Reward) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      title_ar: r.title_ar ?? "",
      description: r.description ?? "",
      description_ar: r.description_ar ?? "",
      points_required: String(r.points_required),
      category: r.category,
      image_url: r.image_url ?? "",
      value: r.value !== null ? String(r.value) : "",
      value_type: r.value_type,
      is_active: r.is_active,
    });
    setError(null);
    setDialogOpen(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title (English) is required.");
      return;
    }
    const pts = Number(form.points_required);
    if (!pts || pts < 1) {
      setError("Points required must be a positive number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      title: form.title.trim(),
      title_ar: form.title_ar.trim() || null,
      description: form.description.trim() || null,
      description_ar: form.description_ar.trim() || null,
      points_required: pts,
      category: form.category,
      type: "service_reward" as RewardType,
      image_url: form.image_url.trim() || null,
      value: form.value !== "" ? Number(form.value) : null,
      value_type: form.value_type,
      promo_code: null,
      is_active: form.is_active,
    };

    let err: { message: string } | null = null;

    if (editingId) {
      const res = await supabase
        .from("rewards")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      err = res.error;
    } else {
      const res = await supabase.from("rewards").insert(payload);
      err = res.error;
    }

    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }

    setDialogOpen(false);
    showToast(
      editingId
        ? "Reward updated successfully."
        : "Reward created successfully.",
    );
    fetchRewards();
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("rewards").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      showToast(`Error: ${error.message}`, false);
    } else {
      showToast("Reward deleted.");
      setRewards((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function handleToggleActive(r: Reward) {
    const { error } = await supabase
      .from("rewards")
      .update({ is_active: !r.is_active, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (!error) {
      setRewards((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, is_active: !r.is_active } : x,
        ),
      );
    }
  }

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = rewards.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterActive === "active" && !r.is_active) return false;
    if (filterActive === "inactive" && r.is_active) return false;
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-6 space-y-6 max-w-[1200px] mx-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Gift className="w-7 h-7 text-orange-500" />
            Rewards Catalogue
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage loyalty rewards — create cards for partner vendors (car wash,
            detailing, etc.) with points, discounts, and images.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 font-bold shrink-0">
          <PlusCircle size={16} />
          Add Reward
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "px-4 py-3 rounded-xl text-sm font-semibold border",
            toast.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700",
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Rewards",
            value: rewards.length,
            color: "text-slate-700",
          },
          {
            label: "Active",
            value: rewards.filter((r) => r.is_active).length,
            color: "text-emerald-600",
          },
          {
            label: "Inactive",
            value: rewards.filter((r) => !r.is_active).length,
            color: "text-slate-400",
          },
          {
            label: "Parts",
            value: rewards.filter((r) => r.category === "parts").length,
            color: "text-orange-600",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-4"
          >
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {label}
            </p>
            <p className={cn("text-3xl font-black mt-1", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider shrink-0">
          Filter
        </span>

        {/* Category */}
        <div className="flex items-center gap-1 flex-wrap">
          {(["all", ...Object.keys(CATEGORY_META)] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c as typeof filterCategory)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg capitalize transition-colors",
                filterCategory === c
                  ? "bg-[#FF4B19] text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {c === "all"
                ? "All categories"
                : CATEGORY_META[c as RewardCategory].label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Active */}
        <div className="flex items-center gap-1">
          {(["all", "active", "inactive"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilterActive(a)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg capitalize transition-colors",
                filterActive === a
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
            >
              {a === "all" ? "All status" : a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-black text-sm">
            {filtered.length} reward{filtered.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-32 bg-slate-100 dark:bg-slate-600 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Gift className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-bold text-slate-600 dark:text-slate-300">
              No rewards found
            </p>
            <p className="text-sm text-slate-400">
              Try adjusting your filters or create a new reward.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 overflow-x-auto">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span className="w-12" />
              <span>Reward</span>
              <span className="w-24 text-center">Category</span>
              <span className="w-20 text-center">Points</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-24 text-right">Actions</span>
            </div>

            {filtered.map((r) => {
              const cat = CATEGORY_META[r.category];
              const valueLabel =
                r.value !== null
                  ? r.value_type === "percent"
                    ? `${r.value}% off`
                    : `EGP ${r.value} off`
                  : "Free";

              return (
                <div
                  key={r.id}
                  className={cn(
                    "grid md:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30",
                    !r.is_active && "opacity-60",
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ImageIcon size={20} className="text-slate-400" />
                    )}
                  </div>

                  {/* Title + description */}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{r.title}</p>
                    {r.title_ar && (
                      <p className="text-xs text-slate-400 truncate" dir="rtl">
                        {r.title_ar}
                      </p>
                    )}
                    {r.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {r.description}
                      </p>
                    )}
                    <p className="text-[11px] font-bold text-orange-500 mt-0.5">
                      {valueLabel}
                    </p>
                  </div>

                  {/* Category */}
                  <div className="w-24 flex justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold",
                        cat.color,
                      )}
                    >
                      {cat.icon}
                      {cat.label}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="w-20 text-center">
                    <span className="text-sm font-black text-primary">
                      {r.points_required.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      pts
                    </span>
                  </div>

                  {/* Active toggle */}
                  <div className="w-20 flex justify-center">
                    <button
                      onClick={() => handleToggleActive(r)}
                      className="flex items-center gap-1 text-xs font-bold transition-colors"
                      title={
                        r.is_active
                          ? "Click to deactivate"
                          : "Click to activate"
                      }
                    >
                      {r.is_active ? (
                        <ToggleRight size={22} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="w-24 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(r)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.title)}
                      disabled={deletingId === r.id}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Gift size={20} className="text-orange-500" />
              {editingId ? "Edit Reward" : "Create New Reward"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            {/* Names row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Title (English) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Free Car Wash"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Title (Arabic)</Label>
                <Input
                  placeholder="مثال: غسيل سيارة مجاني"
                  value={form.title_ar}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title_ar: e.target.value }))
                  }
                  dir="rtl"
                  className="text-right"
                />
              </div>
            </div>

            {/* Descriptions row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Description (English)
                </Label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the reward…"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Description (Arabic)
                </Label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر للمكافأة…"
                  value={form.description_ar}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description_ar: e.target.value }))
                  }
                  dir="rtl"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background resize-none text-right focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Category + Type */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CATEGORY_META) as RewardCategory[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors",
                        form.category === c
                          ? "bg-[#FF4B19] text-white border-[#FF4B19]"
                          : CATEGORY_META[c].color + " hover:opacity-80",
                      )}
                    >
                      {CATEGORY_META[c].icon}
                      {CATEGORY_META[c].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Points + Value row */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  Points Required <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 500"
                  value={form.points_required}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, points_required: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Discount Value</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 100 or 20"
                  value={form.value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Value Type</Label>
                <div className="flex gap-2 h-10">
                  {(["fixed", "percent"] as const).map((vt) => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, value_type: vt }))}
                      className={cn(
                        "flex-1 rounded-lg border text-xs font-bold transition-colors",
                        form.value_type === vt
                          ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                          : "text-slate-500 border-slate-200 hover:bg-slate-50",
                      )}
                    >
                      {vt === "fixed" ? "EGP off" : "% off"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reward Image</Label>
              {form.image_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                  />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-slate-500 truncate max-w-[220px]">
                      {form.image_url.split("/").pop()}
                    </p>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      <X size={13} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary cursor-pointer transition-colors bg-slate-50 dark:bg-slate-900/30">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  {uploadingImage ? (
                    <Loader2
                      size={22}
                      className="animate-spin text-slate-400"
                    />
                  ) : (
                    <>
                      <Upload size={22} className="text-slate-400 mb-1" />
                      <span className="text-xs text-slate-400 font-semibold">
                        Click to upload image
                      </span>
                      <span className="text-[11px] text-slate-300">
                        PNG, JPG, WebP
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl px-4 py-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v }))
                }
                id="is_active"
              />
              <Label
                htmlFor="is_active"
                className="font-semibold cursor-pointer"
              >
                Active — visible to customers in the Rewards page
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 font-bold min-w-[120px]"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Create Reward"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
