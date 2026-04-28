"use client";

/**
 * Parts Seller Sign In — /vendor/login/parts-seller
 *
 * Dedicated login page for parts seller vendors.
 * After sign-in, verifies vendor_type === "parts_seller" before granting access.
 */

import { useState } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Store, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function PartsSellerLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, localePath } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
      return;
    }

    // Check role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "vendor" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This portal is for vendor accounts only.");
      setLoading(false);
      return;
    }

    // Check vendor type
    const { data: vendor } = await supabase
      .from("vendors")
      .select("vendor_type, status")
      .eq("user_id", user.id)
      .single();

    if (vendor?.vendor_type !== "parts_seller" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError(
        "This login is for Parts Sellers only. " +
          "If you're a Service Center, use the Service Center sign in instead.",
      );
      setLoading(false);
      return;
    }

    if (vendor?.status === "pending") {
      await supabase.auth.signOut();
      setError(
        "Your application is still under review. " +
          "You'll receive an email once it's approved.",
      );
      setLoading(false);
      return;
    }

    router.replace(localePath("/vendor/dashboard"));
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md space-y-4">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/">
            <img
              src="/motorlogo.png"
              alt="Warshety"
              className="h-12 w-auto object-contain mx-auto"
            />
          </Link>
          <div className="flex items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700 px-3 py-1 text-sm font-bold">
              <Store className="h-3.5 w-3.5" />
              {t("vendor.login.partsSellerPortal")}
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-background shadow-sm p-8 space-y-6">
          {/* Back link */}
          <Link
            href="/vendor/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("vendor.login.backToVendorLogin")}
          </Link>

          <div>
            <h1 className="text-xl font-black tracking-tight">
              {t("vendor.login.partsSellerSignIn")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("vendor.login.psSignInDesc")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("vendor.login.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@partsstore.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  {t("vendor.login.passwordLabel")}
                </Label>
                <Link
                  href="/auth/login"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("vendor.login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
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

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("vendor.login.signingIn")}
                </>
              ) : (
                t("vendor.login.signInAsPartsSeller")
              )}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            {t("vendor.login.notPartsSeller")}{" "}
            <Link
              href="/vendor/login/service-center"
              className="text-primary font-medium hover:underline"
            >
              {t("vendor.login.serviceCenterSignIn")}
            </Link>
          </p>
          <p>
            {t("vendor.login.wantToBeVendor")}{" "}
            <Link
              href="/vendor/apply"
              className="text-primary font-medium hover:underline"
            >
              {t("vendor.login.applyHere")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
