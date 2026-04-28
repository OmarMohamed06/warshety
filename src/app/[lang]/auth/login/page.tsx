"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const {
    signIn,
    signInWithGoogle,
    session,
    role,
    managedBranchId,
    isLoading: authLoading,
  } = useAuth();
  const router = useRouter();
  const { localePath } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Wait for:
  //   1. pendingRedirect — signIn() returned without error
  //   2. session !== null — SIGNED_IN event fired (prevents racing before auth state updates)
  //   3. !authLoading    — loadProfile() finished so role is accurate
  useEffect(() => {
    if (!pendingRedirect || !session || authLoading) return;
    if (role === "admin") {
      router.replace(localePath("/admin/dashboard"));
    } else if (role === "vendor") {
      router.replace(localePath("/vendor/dashboard"));
    } else if (role === "manager" && managedBranchId) {
      // Branch manager — go directly to their dedicated branch management page
      router.replace(localePath(`/branch/${managedBranchId}`));
    } else {
      router.replace(localePath("/"));
    }
  }, [
    pendingRedirect,
    session,
    authLoading,
    role,
    managedBranchId,
    router,
    localePath,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = await signIn(email, password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Don't read role here — it's null until loadProfile() completes async
    setPendingRedirect(true);
  };

  const handleGoogle = async () => {
    setError(null);
    const err = await signInWithGoogle();
    if (err) setError(err);
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md">
        <LoginForm
          email={email}
          password={password}
          error={error}
          loading={loading || pendingRedirect}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onGoogleSignIn={handleGoogle}
        />
      </div>
    </div>
  );
}

interface LoginFormProps {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleSignIn: () => void;
}

function LoginForm({
  email,
  password,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleSignIn,
  className,
  ...props
}: LoginFormProps & React.ComponentProps<"div">) {
  const { t, locale } = useLanguage();
  const isAr = locale === "ar";
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          {/* ── Form column ───────────────────────────────────── */}
          <form className="p-6 md:p-8 flex flex-col gap-6" onSubmit={onSubmit}>
            {/* Heading */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
              <p className="text-balance text-sm text-muted-foreground">
                {t("auth.signInSubtitle")}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Link
                  href="/auth/forgot-password"
                  className="ms-auto text-sm underline-offset-2 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  {t("auth.signingIn")}
                </span>
              ) : (
                t("auth.login")
              )}
            </Button>

            {/* Social separator */}
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-card px-2 text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>

            {/* Social buttons */}
            <Button
              variant="outline"
              type="button"
              className="w-full flex items-center gap-2"
              onClick={onGoogleSignIn}
              disabled={loading}
            >
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
              Continue with Google
            </Button>

            {/* Sign up link */}
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link
                href="/auth/register"
                className="underline underline-offset-4 hover:text-primary"
              >
                {t("auth.signUp")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Footer links */}
      <p className="text-balance px-6 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        {t("auth.termsPrefix")}{" "}
        <Link href="/legal/terms">{t("auth.termsLink")}</Link> {t("auth.and")}{" "}
        <Link href="/legal/privacy">{t("auth.privacyLink")}</Link>.{" "}
        {t("auth.vendorPrompt")}{" "}
        <Link href="/vendor/apply">{t("auth.applyLink")}</Link>.
      </p>
    </div>
  );
}
