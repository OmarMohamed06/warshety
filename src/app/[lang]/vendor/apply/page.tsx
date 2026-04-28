"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const BENEFITS = [
  {
    icon: "groups",
    title: "Reach More Customers",
    desc: "Tap into thousands of car owners across Egypt actively searching for parts and services every day.",
  },
  {
    icon: "payments",
    title: "Earn More Revenue",
    desc: "List your inventory or services and start receiving orders with secure, on-time payouts.",
  },
  {
    icon: "trending_up",
    title: "Grow Your Business",
    desc: "Access real-time analytics, customer insights, and marketing tools to scale faster.",
  },
];

const STEPS = [
  {
    icon: "edit_note",
    title: "Submit Your Application",
    desc: "Fill in your business details. Takes less than 5 minutes.",
  },
  {
    icon: "verified_user",
    title: "Get Verified",
    desc: "Our team reviews your application and notifies you within 48 hours.",
  },
  {
    icon: "storefront",
    title: "Activate Your Account",
    desc: "Our team activates the account you created during your application. No invite emails — just log in and go.",
  },
  {
    icon: "rocket_launch",
    title: "Start Selling",
    desc: "Go live and start receiving orders from customers across Egypt.",
  },
];

const FAQS = [
  {
    q: "Who can become a vendor on Warshety?",
    a: "Any registered spare parts shop or automotive service center operating in Egypt. We accept both individual shop owners and multi-branch businesses.",
  },
  {
    q: "How long does the approval process take?",
    a: "Applications are reviewed within 48 business hours. You'll receive an email with the outcome and next steps.",
  },
  {
    q: "What commission does Warshety charge?",
    a: "Commission rates vary by category and are shared transparently during onboarding. There are no hidden fees.",
  },
  {
    q: "What documents do I need?",
    a: "A valid commercial registration (سجل تجاري), national ID of the owner, and your business contact details.",
  },
  {
    q: "Can I list both parts and services?",
    a: "Currently vendors register as either a Spare Parts Shop or a Service Center. Multi-category support is coming soon.",
  },
  {
    q: "How will I receive payments?",
    a: "Payouts are processed weekly via bank transfer or Instapay. You can track all earnings in your vendor dashboard.",
  },
];

export default function VendorLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { t, localePath } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-[#111621]">
      {/* ── Hero ── */}
      <section className="relative text-white overflow-hidden">
        <Image
          src="/hero.jpg"
          alt="Vendor hero"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-primary/50" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="material-symbols-outlined text-base">
              storefront
            </span>
            {t("vendor.applyPages.badge")}
          </div>
          <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="text-primary">
              {t("vendor.applyPages.heroTitle")}
            </span>
            <br />
            {t("vendor.applyPages.heroLine2")}
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("vendor.applyPages.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={localePath("/vendor/apply/form")}
              className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/30 text-lg"
            >
              {t("vendor.applyPages.applyNow")}
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href={localePath("/vendor/login")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/15 transition-all border border-white/10"
            >
              {t("vendor.applyPages.vendorSignIn")}
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            {t("vendor.applyPages.alreadyApplied")}{" "}
            <Link
              href={localePath("/vendor/apply/status")}
              className="text-primary hover:underline font-semibold"
            >
              {t("vendor.applyPages.checkYourStatus")}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-primary text-white py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid text-center">
            {[
              // { value: "50K+", label: "Monthly Customers" },
              // { value: "500+", label: "Active Vendors" },
              { value: "48h", label: t("vendor.applyPages.approvalTimeLabel") },
            ].map((s) => (
              <div key={s.label} className="px-6 py-2">
                <p className="text-3xl font-black">{s.value}</p>
                <p className="text-white/70 text-sm font-medium mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why partner with us ── */}
      <section className="py-24 bg-[#f6f6f8] dark:bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-3">
            {t("vendor.applyPages.whyPartnerTitle")}{" "}
            <span className="text-primary">
              {t("vendor.applyPages.whyPartnerHighlight")}
            </span>
          </h2>
          <p className="text-muted-foreground mb-14 text-base max-w-xl mx-auto">
            {t("vendor.applyPages.whyPartnerSubtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {BENEFITS.map((b, i) => (
              <div
                key={b.icon}
                className="flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-primary text-4xl">
                    {b.icon}
                  </span>
                </div>
                <h3 className="text-lg font-black mb-2">
                  {t(`vendor.applyPages.benefit${i}Title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`vendor.applyPages.benefit${i}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How we'll work together ── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-3">
            {t("vendor.applyPages.howWorkTitle")}
          </h2>
          <p className="text-muted-foreground mb-14 text-base max-w-xl mx-auto">
            {t("vendor.applyPages.howWorkSubtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.icon}
                className="bg-[#f6f6f8] dark:bg-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-white text-sm font-black rounded-full flex items-center justify-center shadow-md">
                  {i + 1}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    {step.icon}
                  </span>
                </div>
                <h3 className="font-black text-base mb-2">
                  {t(`vendor.applyPages.step${i}Title`)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(`vendor.applyPages.step${i}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-[#f6f6f8] dark:bg-slate-900/40">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center mb-3">
            {t("vendor.applyPages.faqTitle")}
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            {t("vendor.applyPages.faqSubtitle")}
          </p>
          <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-bold text-sm">
                    {t(`vendor.applyPages.faq${i}Q`)}
                  </span>
                  <span
                    className="material-symbols-outlined text-muted-foreground text-xl shrink-0 ml-4 transition-transform"
                    style={{
                      transform:
                        openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/20">
                    <p className="pt-4">{t(`vendor.applyPages.faq${i}A`)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-slate-950 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <span className="material-symbols-outlined text-primary text-5xl mb-4 block">
            rocket_launch
          </span>
          <h2 className="text-4xl font-black mb-4">
            {t("vendor.applyPages.ctaTitle")}
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            {t("vendor.applyPages.ctaSubtitle")}
          </p>
          <Link
            href={localePath("/vendor/apply/form")}
            className="inline-flex items-center gap-2 px-12 py-4 bg-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/30 text-lg"
          >
            {t("vendor.applyPages.startYourApplication")}
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
