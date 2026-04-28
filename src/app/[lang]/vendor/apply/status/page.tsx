"use client";

import { useEffect, useState } from "react";
import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type AppStatus = "pending" | "approved" | "rejected" | "suspended";

interface VendorApplication {
  id: string;
  status: AppStatus;
  submitted_at: string | null;
  business_name: string;
}

export default function VendorStatusPage() {
  const { t } = useLanguage();
  const { session, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [app, setApp] = useState<VendorApplication | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setAppLoading(false);
      return;
    }
    supabase
      .from("vendor_applications")
      .select("id, status, submitted_at, business_name")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setApp(data ?? null);
        setAppLoading(false);
      });
  }, [authLoading, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading || appLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#FF4B19]/20 border-t-[#FF4B19] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-400">
              lock
            </span>
          </div>
          <h1 className="text-2xl font-black mb-2">
            {t("vendor.applyPages.signInToCheck")}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {t("vendor.applyPages.signInToCheckDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/login"
              className="flex-1 py-3 text-center bg-[#FF4B19] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              {t("vendor.applyPages.vendorSignIn")}
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 text-center border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-slate-400 transition-all"
            >
              {t("vendor.applyPages.backToHomepage")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── No application found ──────────────────────────────────────────────────
  if (!app) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-400">
              article
            </span>
          </div>
          <h1 className="text-2xl font-black mb-2">
            {t("vendor.applyPages.noApplicationTitle")}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {t("vendor.applyPages.noApplicationDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vendor/apply"
              className="flex-1 py-3 text-center bg-[#FF4B19] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                add_circle
              </span>
              {t("vendor.applyPages.applyNow")}
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 text-center border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-slate-400 transition-all"
            >
              {t("vendor.applyPages.backToHomepage")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Application exists — derive display state ─────────────────────────────
  const isPending = app.status === "pending";
  const isApproved = app.status === "approved";
  const isRejected = app.status === "rejected" || app.status === "suspended";

  const bannerBg = isApproved
    ? "bg-green-500 shadow-green-500/30"
    : isRejected
      ? "bg-red-500 shadow-red-500/30"
      : "bg-[#FF4B19] shadow-[#FF4B19]/30";

  const bannerIcon = isApproved
    ? "verified"
    : isRejected
      ? "cancel"
      : "hourglass_top";
  const bannerTitle = isApproved
    ? t("vendor.applyPages.approved")
    : isRejected
      ? t("vendor.applyPages.rejected")
      : t("vendor.applyPages.appSubmittedTitle");
  const bannerDesc = isApproved
    ? t("vendor.applyPages.approvedDesc")
    : isRejected
      ? t("vendor.applyPages.rejectedDesc")
      : t("vendor.applyPages.pendingDesc");

  const submittedDate = app.submitted_at
    ? new Date(app.submitted_at).toLocaleDateString("en-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const STATUS_STEPS = [
    {
      key: "submitted",
      label: t("vendor.applyPages.statusSubmittedLabel"),
      desc: t("vendor.applyPages.statusSubmittedDesc"),
      icon: "task_alt",
      done: true,
      active: false,
      rejected: false,
    },
    {
      key: "review",
      label: t("vendor.applyPages.statusReviewLabel"),
      desc: t("vendor.applyPages.statusReviewDesc"),
      icon: "manage_search",
      done: isApproved || isRejected,
      active: isPending,
      rejected: false,
    },
    {
      key: "approved",
      label: t("vendor.applyPages.statusApprovedLabel"),
      desc: t("vendor.applyPages.statusApprovedDesc"),
      icon: isRejected ? "cancel" : "verified",
      done: isApproved,
      active: isApproved,
      rejected: isRejected,
    },
  ];

  const NEXT_STEPS = [
    { icon: "email", text: t("vendor.applyPages.nextStep0") },
    { icon: "phone_callback", text: t("vendor.applyPages.nextStep1") },
    { icon: "notifications_active", text: t("vendor.applyPages.nextStep2") },
    { icon: "dashboard", text: t("vendor.applyPages.nextStep3") },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621] flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        {/* Status banner */}
        <div
          className={`${bannerBg} rounded-3xl p-10 text-center text-white mb-8 shadow-2xl`}
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-4xl">
              {bannerIcon}
            </span>
          </div>
          <h1 className="text-3xl font-black mb-2">{bannerTitle}</h1>
          <p className="text-white/80 max-w-sm mx-auto text-sm">{bannerDesc}</p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            {app.business_name && (
              <span className="bg-white/10 rounded-full px-4 py-1 text-xs font-bold tracking-wider">
                {app.business_name}
              </span>
            )}
            {submittedDate && (
              <span className="bg-white/10 rounded-full px-4 py-1 text-xs font-bold tracking-wider">
                {submittedDate}
              </span>
            )}
          </div>
        </div>

        {/* Status tracker */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <h2 className="text-lg font-black mb-6">
            {t("vendor.applyPages.appStatusTitle")}
          </h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.key} className="flex gap-4">
                {/* Timeline dot + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      step.rejected
                        ? "bg-red-500 text-white"
                        : step.done && !step.active
                          ? "bg-green-500 text-white"
                          : step.active
                            ? "bg-[#FF4B19] text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {step.icon}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-14 mt-1 ${
                        step.done
                          ? "bg-green-200"
                          : "bg-slate-100 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </div>
                {/* Step content */}
                <div className="pt-2 pb-10">
                  <p
                    className={`font-bold text-sm ${
                      step.rejected
                        ? "text-red-500"
                        : step.active
                          ? "text-[#FF4B19]"
                          : ""
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>

                  {/* Pulse badge for review in progress */}
                  {step.active && isPending && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-[#FF4B19]/10 text-[#FF4B19] font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-[#FF4B19] rounded-full animate-pulse" />
                      {t("vendor.applyPages.inProgress")}
                    </span>
                  )}
                  {/* Approved badge */}
                  {isApproved && step.key === "approved" && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {t("vendor.applyPages.approved")}
                    </span>
                  )}
                  {/* Rejected badge */}
                  {isRejected && step.key === "approved" && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full">
                      {t("vendor.applyPages.rejected")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's next — only shown while pending */}
        {isPending && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
            <h2 className="text-lg font-black mb-4">
              {t("vendor.applyPages.whatsNext")}
            </h2>
            <ul className="space-y-3">
              {NEXT_STEPS.map((item) => (
                <li key={item.icon} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4B19] text-lg mt-0.5">
                    {item.icon}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approved call-to-action */}
        {isApproved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 mb-6 flex items-center gap-4">
            <span className="material-symbols-outlined text-green-600 text-3xl shrink-0">
              rocket_launch
            </span>
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              {t("vendor.applyPages.appSubmittedDesc")}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 text-center border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:border-slate-400 transition-all"
          >
            {t("vendor.applyPages.backToHomepage")}
          </Link>

          {isApproved ? (
            <Link
              href="/vendor/dashboard"
              className="flex-1 py-3 text-center bg-green-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                dashboard
              </span>
              {t("vendor.applyPages.nextStep3")}
            </Link>
          ) : (
            <a
              href="mailto:vendors@warshety.eg"
              className="flex-1 py-3 text-center bg-[#FF4B19] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                support_agent
              </span>
              {t("vendor.applyPages.contactSupport")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
