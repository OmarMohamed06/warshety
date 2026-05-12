"use client";

import { useState, useEffect } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  PackageCheck,
} from "lucide-react";
import { GOVERNORATES, getAreas, tGov, tArea } from "@/lib/locationData";

export default function VendorSettingsPage() {
  const { user, vendor, refreshProfile } = useAuth();
  const { t, locale } = useLanguage();
  const supabase = createClient();

  // ── Form state — all fields editable ──────────────────────────────────────
  const [businessName, setBusinessName] = useState("");
  const [businessNameAr, setBusinessNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Pickup address state (for parts_seller vendors only) ──────────────────
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupGovernorate, setPickupGovernorate] = useState("");
  const [pickupDistrict, setPickupDistrict] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [bostaPickupId, setBostaPickupId] = useState<string | null>(null);
  const [registeringPickup, setRegisteringPickup] = useState(false);
  const [pickupSaved, setPickupSaved] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);

  // Sync all fields once vendor data arrives from AuthContext
  useEffect(() => {
    if (vendor) {
      setBusinessName(vendor.business_name ?? "");
      setBusinessNameAr(vendor.business_name_ar ?? "");
      setDescription(vendor.description ?? "");
      setPhone(vendor.phone ?? "");
      setBusinessEmail(vendor.email ?? "");
      setGovernorate(vendor.governorate ?? "");
      setCity(vendor.city ?? "");
      setAddress(vendor.address ?? "");
      // Pickup address fields — auto-fill from vendor profile if not yet set
      setPickupAddress((vendor as any).pickup_address || vendor.address || "");
      setPickupCity((vendor as any).pickup_city || vendor.city || "");
      setPickupGovernorate(
        (vendor as any).pickup_governorate || vendor.governorate || "",
      );
      setPickupDistrict(
        (vendor as any).pickup_district || (vendor as any).district || "",
      );
      setPickupPhone((vendor as any).pickup_phone || vendor.phone || "");
      setBostaPickupId((vendor as any).bosta_pickup_address_id ?? null);
    }
  }, [vendor]);

  const handleRegisterPickup = async () => {
    setRegisteringPickup(true);
    setPickupError(null);
    setPickupSaved(false);

    const res = await fetch("/api/vendor/bosta/register-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickupAddress,
        pickupCity,
        pickupGovernorate,
        pickupDistrict,
        pickupPhone,
      }),
    });

    const json = await res.json();
    setRegisteringPickup(false);

    if (!res.ok) {
      setPickupError(json.error ?? "Registration failed");
      return;
    }

    setBostaPickupId(json.bostaLocationId);
    setPickupSaved(true);
    await refreshProfile();
    setTimeout(() => setPickupSaved(false), 4000);
  };

  const handleSave = async () => {
    if (!vendor) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: e } = await supabase
      .from("vendors")
      .update({
        business_name: businessName.trim(),
        business_name_ar: businessNameAr.trim() || null,
        description: description.trim() || null,
        phone: phone.trim() || null,
        email: businessEmail.trim() || null,
        governorate: governorate || null,
        city: city.trim() || null,
        address: address.trim() || null,
      })
      .eq("id", vendor.id);

    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <VendorLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-black">{t("vendor.settingsTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("vendor.settingsSubtitle")}
          </p>
        </div>

        {/* Shared alert banners */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {t("vendor.savedSuccess")}
          </div>
        )}

        {/* ── Business Profile ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vendor.businessProfile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>{t("vendor.businessName")}</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Business Name"
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t("vendor.businessNameAr")}
                <span className="text-muted-foreground font-normal text-xs ms-1">
                  ({t("vendor.optional") ?? "optional"})
                </span>
              </Label>
              <Input
                dir="rtl"
                value={businessNameAr}
                onChange={(e) => setBusinessNameAr(e.target.value)}
                placeholder={t("vendor.businessNameArPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("vendor.description")}</Label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Tell customers about your business…"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Contact Details ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vendor.contactDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("vendor.phoneNumber")}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 1X XXXX XXXX"
                  type="tel"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("vendor.businessEmail")}</Label>
                <Input
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder={t("vendor.businessEmailPlaceholder")}
                  type="email"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {/* Auth login email is shown read-only in Account Info below */}
              This is your public business contact — not your login email.
            </p>
          </CardContent>
        </Card>

        {/* ── Location ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vendor.locationSection")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{t("vendor.governorate")}</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                  value={governorate}
                  onChange={(e) => {
                    setGovernorate(e.target.value);
                    setCity("");
                  }}
                >
                  <option value="">
                    {t("vendor.applyPages.selectGovernorate")}
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {tGov(g, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("vendor.city")}</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!governorate}
                >
                  <option value="">{t("vendor.applyPages.selectCity")}</option>
                  {getAreas(governorate).map((a) => (
                    <option key={a} value={a}>
                      {tArea(a, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("vendor.address")}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, building, district…"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Pickup Address (parts_seller only) ───────────────────────────── */}
        {vendor?.vendor_type === "parts_seller" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Pickup Address for Bosta Deliveries
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                This is where Bosta couriers will pick up your packages.
                Register it once — all future shipments use it automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status badge */}
              {bostaPickupId ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg text-sm text-green-700 dark:text-green-400">
                  <PackageCheck className="w-4 h-4 shrink-0" />
                  Registered with Bosta
                  <code className="ml-auto text-xs font-mono opacity-70">
                    {bostaPickupId}
                  </code>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Not yet registered — fill in the fields below and click
                  &ldquo;Register with Bosta&rdquo;.
                </div>
              )}

              {pickupError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {pickupError}
                </div>
              )}
              {pickupSaved && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Pickup address registered successfully with Bosta!
                </div>
              )}

              {/* Governorate + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Governorate</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                    value={pickupGovernorate}
                    onChange={(e) => {
                      setPickupGovernorate(e.target.value);
                      setPickupCity("");
                    }}
                  >
                    <option value="">Select governorate</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {tGov(g, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>City / District</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    disabled={!pickupGovernorate}
                  >
                    <option value="">Select city</option>
                    {getAreas(pickupGovernorate).map((a) => (
                      <option key={a} value={a}>
                        {tArea(a, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* District / neighbourhood (freetext) */}
              <div className="space-y-1">
                <Label>
                  Neighbourhood / Area
                  <span className="text-muted-foreground font-normal text-xs ms-1">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={pickupDistrict}
                  onChange={(e) => setPickupDistrict(e.target.value)}
                  placeholder="e.g. Nasr City, Mohandiseen"
                />
              </div>

              {/* Street address */}
              <div className="space-y-1">
                <Label>Street Address</Label>
                <Input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="e.g. 15 Ahmed Orabi Street, Building 3"
                />
              </div>

              {/* Pickup phone */}
              <div className="space-y-1">
                <Label>
                  Pickup Contact Phone
                  <span className="text-muted-foreground font-normal text-xs ms-1">
                    (defaults to business phone)
                  </span>
                </Label>
                <Input
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  placeholder="+20 1X XXXX XXXX"
                  type="tel"
                />
              </div>

              <Button
                onClick={handleRegisterPickup}
                disabled={
                  registeringPickup ||
                  !pickupAddress.trim() ||
                  !pickupCity.trim()
                }
                variant={bostaPickupId ? "outline" : "default"}
                className="w-full sm:w-auto"
              >
                {registeringPickup ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering…
                  </>
                ) : bostaPickupId ? (
                  "Update Bosta Pickup Address"
                ) : (
                  "Register with Bosta"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving || !businessName.trim()}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("vendor.saving")}
            </>
          ) : (
            t("vendor.saveChanges")
          )}
        </Button>

        {/* ── Account Info (read-only) ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("vendor.accountInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <Row label={t("vendor.email")} value={user?.email ?? "—"} />
              <Row
                label={t("vendor.accountType")}
                value={
                  vendor?.vendor_type === "service_center"
                    ? t("vendor.serviceCenterType")
                    : t("vendor.partsSellerType")
                }
              />
              <Row label={t("vendor.status")}>
                <Badge
                  className={
                    vendor?.status === "approved"
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : vendor?.status === "pending"
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                  }
                >
                  {vendor?.status ?? "—"}
                </Badge>
              </Row>
              <Separator />
              <Row
                label={t("vendor.memberSince")}
                value={
                  vendor?.created_at
                    ? new Date(vendor.created_at).toLocaleDateString("en-EG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-muted-foreground font-medium">{label}</span>
      {children ?? <span className="font-semibold">{value}</span>}
    </div>
  );
}
