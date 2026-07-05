"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { APP_CONFIG } from "@/config/app-download";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-[78px] sm:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            {/* Logo */}
            <Link href="/" className="shrink-0 h-16 flex items-center">
              <img
                src="/warshety-footer.svg"
                alt="Warshety Logo"
                className="h-28 w-auto object-contain"
              />
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Shop & Service */}
          <div>
            <p className="font-semibold text-sm mb-5 text-white">
              {t("footer.shopService")}
            </p>
            <ul className="space-y-3 text-sm text-slate-400">
              {[{ labelKey: "footer.bookMechanic", href: "/services" }].map(
                (link) => (
                  <li key={link.labelKey}>
                    <Link
                      href={link.href}
                      className="hover:text-[#FF4B19] transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-semibold text-sm mb-5 text-white">
              {t("footer.company")}
            </p>
            <ul className="space-y-3 text-sm text-slate-400 mb-6">
              {[
                { labelKey: "footer.partnerWithUs", href: "/vendor/apply" },
                { labelKey: "footer.blog", href: "/blog" },
              ].map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    className="hover:text-[#FF4B19] transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <p className="font-semibold text-sm mb-5 text-white">
              {t("footer.newsletter")}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {t("footer.newsletterDesc")}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder={t("footer.emailPlaceholder")}
                type="email"
                className="h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <Button size="icon" className="h-9 w-9 shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  send
                </span>
              </Button>
            </div>
            {/* Contact */}
            <ul className="space-y-3 text-sm text-slate-400 mt-5">
              <li>
                <a
                  href="mailto:support@warshety.com"
                  className="flex items-center gap-2 hover:text-[#FF4B19] transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-[#FF4B19]"
                    style={{ fontSize: "16px" }}
                  >
                    mail
                  </span>
                  support@warshety.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+201022116644"
                  className="flex items-center gap-2 hover:text-[#FF4B19] transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-[#FF4B19]"
                    style={{ fontSize: "16px" }}
                  >
                    phone
                  </span>
                  <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                    +20 102 211 6644
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="mb-6 bg-slate-800" />

        <Separator className="mb-6 bg-slate-800" />

        {/* Download App section */}
        {APP_CONFIG.enabled && APP_CONFIG.features.footerSection && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-[#FF4B19] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF4B19]/30">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontSize: 20 }}
                >
                  phone_iphone
                </span>
              </div>
              <div>
                <p className="text-white font-black text-sm">
                  {t("footer.downloadApp")}
                </p>
                <p className="text-slate-400 text-xs">
                  {t("footer.downloadAppDesc")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:ms-auto">
              <a
                href={APP_CONFIG.urls.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black hover:bg-slate-800 transition text-white rounded-xl px-3.5 py-2 text-xs font-bold"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current shrink-0"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>
              <a
                href={APP_CONFIG.urls.android}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#FF4B19] hover:bg-[#e84213] transition text-white rounded-xl px-3.5 py-2 text-xs font-bold"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current shrink-0"
                >
                  <path d="M3.18 23.76A1 1 0 0 1 3 23.1V.9A1 1 0 0 1 3.18.24l11.27 11.76zm1.87-.9 10.14-5.76-2.27-2.37zm10.14-14.76L5.05 2.14l7.87 8.21zM16.82 7.1 13.6 12l3.22 4.9 4.1-2.34a1 1 0 0 0 0-1.72z" />
                </svg>
                Google Play
              </a>
              {/* QR */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(APP_CONFIG.urls.download)}&bgcolor=0f172a&color=FF4B19&qzone=1`}
                alt="Scan to download"
                width={36}
                height={36}
                className="rounded-lg hidden sm:block"
                loading="lazy"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t("footer.copyright")}</p>
          <div className="flex gap-6">
            <Link
              href="/legal/privacy"
              className="hover:text-white transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-white transition-colors"
            >
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
