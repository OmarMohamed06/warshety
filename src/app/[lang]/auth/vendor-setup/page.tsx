"use client";

/**
 * Vendor Setup Page — /auth/vendor-setup
 *
 * Vendors land here after clicking their invite email link.
 * The auth callback has already exchanged the invite token for a session.
 *
 * This page:
 *  1. Reads the vendor type from the invite metadata
 *  2. Lets the vendor set a password for future logins
 *  3. Calls completeVendorSetup() to create the vendors row + set role=vendor
 *  4. Redirects to /vendor/dashboard
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { completeVendorSetup } from "@/app/actions/adminActions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  Store,
  Wrench,
  Eye,
  EyeOff,
} from "lucide-react";

type PageState = "loading" | "setup" | "saving" | "done" | "error";

export default function VendorSetupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();
  const { user, session, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [vendorType, setVendorType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Bootstrap: verify session + check if already set up ──────────────────
  useEffect(() => {
    if (authLoading) return; // Wait for AuthProvider to hydrate

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    async function init() {
      // If vendor record already exists → go straight to dashboard
      const { data: existing } = await supabase
        .from("vendors")
        .select("id, vendor_type, business_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        router.replace("/vendor/dashboard");
        return;
      }

      // Read invite metadata from the Supabase auth session user
      const meta = (session?.user?.user_metadata ?? {}) as Record<string, string>;
      setVendorType(meta.vendor_type ?? null);
      setState("setup");
    }
    init();
  }, [authLoading, user, session, supabase, router]);

  // ── Form submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setState("saving");

    // 1. Set password so vendor can sign in with email+password in the future
    const { error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr) {
      setError(pwErr.message);
      setState("setup");
      return;
    }

    // 2. Create the vendor row + update role in public.users
    const result = await completeVendorSetup();
    if (result.error) {
      setError(result.error);
      setState("setup");
      return;
    }

    if (result.businessName) setBusinessName(result.businessName);
    if (result.vendorType) setVendorType(result.vendorType);
    setState("done");

    setTimeout(() => router.replace("/vendor/dashboard"), 2000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          {businessName ? `${businessName} is ready!` : "Account ready!"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Redirecting to your vendor dashboard…
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
      </div>
    );
  }

  const isServiceCenter = vendorType === "service_center";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-background shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
              {isServiceCenter ? (
                <Wrench className="h-8 w-8 text-primary" />
              ) : (
                <Store className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Welcome to Warshety!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your application was approved. Set a password to activate your
                vendor account.
              </p>
            </div>
          </div>

          {/* Role badge */}
          {vendorType && (
            <div
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold",
                isServiceCenter
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-amber-50 border-amber-200 text-amber-700",
              )}
            >
              {isServiceCenter ? (
                <Wrench className="h-4 w-4" />
              ) : (
                <Store className="h-4 w-4" />
              )}
              {isServiceCenter ? "Service Center" : "Parts Seller"} Account
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("auth.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={state === "saving"}
            >
              {state === "saving" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account…
                </>
              ) : (
                "Activate Vendor Account"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already set up?{" "}
            <a href="/vendor/login" className="text-primary underline">
              Sign in to vendor portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
