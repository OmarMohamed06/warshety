"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";

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
              {[
                { labelKey: "footer.findSpareParts", href: "/parts" },
                { labelKey: "footer.bookMechanic", href: "/services" },
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
                  dir="ltr"
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
