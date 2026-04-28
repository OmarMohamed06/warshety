"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Ticket, PlusCircle, Pencil, Trash2, Copy, Check } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PromoCode {
  id: string;
  code: string;
  discount_pct: number;
  label: string;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
}

const emptyForm = {
  code: "",
  discount_pct: "",
  label: "",
  active: true,
  expires_at: "",
  usage_limit: "",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminPromoCodesPage() {
  const { isRTL, t } = useLanguage();
  const supabase = createClient();

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setPromos((data as unknown as PromoCode[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setForm({
      code: p.code,
      discount_pct: String(p.discount_pct),
      label: p.label,
      active: p.active,
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : "",
      usage_limit: p.usage_limit != null ? String(p.usage_limit) : "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      setError("Code is required.");
      return;
    }
    const pct = Number(form.discount_pct);
    if (!pct || pct < 1 || pct > 100) {
      setError("Discount must be between 1 and 100%.");
      return;
    }
    if (!form.label.trim()) {
      setError("Label is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_pct: pct,
      label: form.label.trim(),
      active: form.active,
      expires_at: form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    };

    let err;
    if (editingId) {
      ({ error: err } = await supabase
        .from("promo_codes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq("id", editingId));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ error: err } = await supabase
        .from("promo_codes")
        .insert(payload as any));
    }

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDialogOpen(false);
    fetchPromos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code? This cannot be undone.")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    fetchPromos();
  };

  const handleToggleActive = async (p: PromoCode) => {
    await supabase
      .from("promo_codes")
      .update({ active: !p.active })
      .eq("id", p.id);
    fetchPromos();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isExpired = (p: PromoCode) =>
    p.expires_at ? new Date(p.expires_at) < new Date() : false;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Promo Codes</h1>
            <p className="text-sm text-muted-foreground">
              Manage discount codes for social media &amp; email campaigns
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          New Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Codes", value: promos.length },
          {
            label: "Active",
            value: promos.filter((p) => p.active && !isExpired(p)).length,
          },
          {
            label: "Total Uses",
            value: promos.reduce((s, p) => s + p.usage_count, 0),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Promo Codes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : promos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No promo codes yet</p>
              <p className="text-sm">
                Create your first code to share with customers.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {promos.map((p) => {
                const expired = isExpired(p);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Code + label */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-sm tracking-widest">
                          {p.code}
                        </span>
                        <button
                          onClick={() => copyCode(p.code, p.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === p.id ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.label}
                      </p>
                    </div>

                    {/* Discount */}
                    <div className="text-center w-16">
                      <p className="font-black text-primary">
                        {p.discount_pct}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">OFF</p>
                    </div>

                    {/* Usage */}
                    <div className="text-center w-20">
                      <p className="font-semibold text-sm">
                        {p.usage_count}
                        {p.usage_limit != null ? ` / ${p.usage_limit}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">uses</p>
                    </div>

                    {/* Expiry */}
                    <div className="w-28 text-xs text-muted-foreground text-center">
                      {p.expires_at
                        ? new Date(p.expires_at).toLocaleDateString()
                        : "No expiry"}
                    </div>

                    {/* Status badge */}
                    <div className="w-20 flex justify-center">
                      {expired ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Expired
                        </Badge>
                      ) : p.active ? (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => handleToggleActive(p)}
                    />

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Promo Code" : "New Promo Code"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g. SUMMER30"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className="font-mono tracking-widest"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount % *</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 20"
                  value={form.discount_pct}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount_pct: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                placeholder="e.g. 20% Welcome offer for new customers"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("admin.offers.expiresOn")}</Label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expires_at: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.offers.usageLimit")}</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usage_limit: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border rounded-xl px-4">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-muted-foreground">
                  Customers can apply this code at checkout
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Code"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
