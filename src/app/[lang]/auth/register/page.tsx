"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const { signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div className="p-6 md:p-8 flex flex-col gap-6">
                {/* Heading */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    {t("auth.createAccount")}
                  </h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    {t("auth.createSubtitle")}
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm">
                    {error}
                  </div>
                )}

                {/* Google sign-up */}
                <Button
                  variant="outline"
                  type="button"
                  className="w-full flex items-center gap-2"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="size-4"
                    >
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                  {loading ? t("auth.signingIn") : "Continue with Google"}
                </Button>

                {/* Sign in link */}
                <p className="text-center text-sm text-muted-foreground">
                  {t("auth.alreadyHaveAccount")}{" "}
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    {t("auth.signIn")}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer links */}
          <p className="text-balance px-6 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
            {t("auth.bySigningUp")}{" "}
            <Link href="/legal/terms">{t("auth.termsLink")}</Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/legal/privacy">{t("auth.privacyLink")}</Link>.{" "}
            {t("auth.vendorPrompt")}{" "}
            <Link href="/vendor/apply">{t("auth.applyLink")}</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
