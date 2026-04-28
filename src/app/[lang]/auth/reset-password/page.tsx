"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const { localePath, t } = useLanguage();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const errorCode = params.get("error_code") ?? params.get("error");
    if (
      errorCode === "otp_expired" ||
      params.get("error") === "access_denied"
    ) {
      setLinkExpired(true);
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      // Hand tokens to the server-side API route to set session cookies.
      // This avoids the client/middleware storage-lock race condition.
      const url = `/api/auth/set-session?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&next=/en/auth/reset-password`;
      window.location.replace(url);
    } else {
      // No tokens — page was opened directly (session already in cookies from prior redirect)
      setSessionReady(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sessionReady) {
      setError("Session not ready. Please wait or re-request the link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(() => router.replace(localePath("/auth/login")), 3000);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden shadow-md">
          <CardContent className="p-8">
            {linkExpired ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-xl font-bold">Link Expired</h1>
                <p className="text-sm text-muted-foreground">
                  This password reset link has expired or already been used.
                  Please request a new one.
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="mt-2 inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Request New Link
                </Link>
              </div>
            ) : done ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-xl font-bold">Password Updated</h1>
                <p className="text-sm text-muted-foreground">
                  Your password has been changed. Redirecting you to login…
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 mb-6">
                  <h1 className="text-xl font-bold">Set New Password</h1>
                  <p className="text-sm text-muted-foreground">
                    Choose a strong password for your Warshety account.
                  </p>
                </div>
                {!sessionReady && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className="w-4 h-4 border-2 border-muted border-t-orange-500 rounded-full animate-spin" />
                    Verifying reset link…
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t("auth.newPassword")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your new password"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
