"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("auth.genericError"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("auth.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10"
    >
      <div className="w-full max-w-md">
        <Card className="overflow-hidden shadow-md">
          <CardContent className="p-8">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-xl font-bold">{t("auth.forgotSuccess")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("auth.forgotSuccessDetail")}
                </p>
                <Link
                  href="/auth/login"
                  className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {isAr ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                  {t("auth.forgotBack")}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-2 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold">{t("auth.forgotTitle")}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t("auth.forgotSubtitle")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("auth.forgotEmailLabel")}</Label>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  {error && (
                    <p
                      className={`text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2 ${isAr ? "text-right" : "text-left"}`}
                    >
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("auth.forgotSend")}
                      </span>
                    ) : (
                      t("auth.forgotSend")
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  >
                    {isAr ? (
                      <ArrowRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    )}
                    {t("auth.forgotBack")}
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
