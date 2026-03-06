"use client";

import { useState } from "react";
import VendorLayout from "@/components/vendor/VendorLayout";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function VendorSettingsPage() {
  const { user, vendor, refreshProfile } = useAuth();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState(vendor?.business_name ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [city, setCity] = useState(vendor?.city ?? "");
  const [address, setAddress] = useState(vendor?.address ?? "");
  const [description, setDescription] = useState(vendor?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!vendor) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: e } = await supabase
      .from("vendors")
      .update({
        business_name: businessName,
        phone,
        city,
        address,
        description,
      })
      .eq("id", vendor.id);

    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inp =
    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30";

  return (
    <VendorLayout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-black">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your vendor profile and account details.
          </p>
        </div>

        {/* Profile card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="font-black mb-5">Business Profile</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              Changes saved successfully.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Business Name
              </label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inp}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inp}
                  placeholder="+20 1X XXXX XXXX"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inp}
                  placeholder="Cairo"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inp}
                placeholder="Street, District"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inp} resize-none`}
                placeholder="Tell customers about your business…"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 bg-[#FF4B19] hover:bg-[#e03d10] text-white font-black px-8 py-3 rounded-xl transition disabled:opacity-60 shadow-lg shadow-[#FF4B19]/20"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Account info (read-only) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="font-black mb-4">Account Info</h2>
          <div className="space-y-3 text-sm">
            <Row label="Email" value={user?.email ?? "—"} />
            <Row
              label="Account Type"
              value={
                vendor?.vendor_type === "service_center"
                  ? "Service Center"
                  : "Parts Seller"
              }
            />
            <Row label="Status">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  vendor?.status === "approved"
                    ? "bg-green-100 text-green-700"
                    : vendor?.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {vendor?.status ?? "—"}
              </span>
            </Row>
            <Row
              label="Member since"
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
        </div>
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
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
      <span className="text-slate-500 font-medium">{label}</span>
      {children ?? <span className="font-semibold">{value}</span>}
    </div>
  );
}
