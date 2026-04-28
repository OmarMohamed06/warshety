"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";

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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              W
            </span>
            Warshety
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                {t("auth.createAccount")}
              </h1>
              <p className="text-sm text-muted-foreground text-balance">
                {t("auth.createSubtitle")}
              </p>
            </div>

            {error && (
              <div className="w-full bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full flex items-center gap-3 h-11 text-sm font-medium"
              onClick={handleGoogle}
              disabled={loading}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0"
                >
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
              )}
              {loading ? "Redirecting..." : "Sign up with Google"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                href="/auth/login"
                className="underline underline-offset-4 hover:text-primary font-medium"
              >
                {t("auth.signIn")}
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              {t("auth.bySigningUp")}{" "}
              <Link href="/legal/terms" className="underline underline-offset-4 hover:text-primary">
                {t("auth.termsLink")}
              </Link>{" "}
              {t("auth.and")}{" "}
              <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-primary">
                {t("auth.privacyLink")}
              </Link>.
            </p>
          </div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <img
          src="/loginphoto.jpg"
          alt="Warshety"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/70 via-primary/30 to-transparent" />
        <div className="absolute inset-0 flex items-end p-10">
          <div className="text-white max-w-sm">
            <p className="text-2xl font-bold leading-snug">
              Join Warshety today.
            </p>
            <p className="mt-2 text-sm text-white/70">
              The easiest way to book car services and find parts in Egypt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
