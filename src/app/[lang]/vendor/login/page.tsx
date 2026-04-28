"use client";

/**
 * Vendor Portal Landing — /vendor/login
 *
 * Role-selection page. Directs vendors to their dedicated sign-in
 * based on vendor type: service center or parts seller.
 */

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { Store, Wrench, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function VendorLoginPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/">
            <img
              src="/motorlogo.png"
              alt="Warshety"
              className="h-12 w-auto object-contain mx-auto"
            />
          </Link>
          <p className="text-sm font-semibold text-muted-foreground">
            {t("vendor.login.vendorPortal")}
          </p>
        </div>

        {/* Heading */}
        <div className="rounded-2xl border bg-background shadow-sm p-8 space-y-6">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {t("vendor.login.signInVendorAccount")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("vendor.login.chooseAccountType")}
            </p>
          </div>

          {/* Role cards */}
          <div className="space-y-3">
            <Link
              href="/vendor/login/service-center"
              className="flex items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors p-5 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-blue-900">
                  {t("vendor.login.serviceCenterCard")}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {t("vendor.login.scCardDesc")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 shrink-0 transition-colors" />
            </Link>

            <Link
              href="/vendor/login/parts-seller"
              className="flex items-center gap-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-colors p-5 group"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-900">
                  {t("vendor.login.partsSellerCard")}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {t("vendor.login.psCardDesc")}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400 group-hover:text-amber-600 shrink-0 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Footer links */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            {t("vendor.login.wantToBeVendor")}{" "}
            <Link
              href="/vendor/apply"
              className="text-primary font-medium hover:underline"
            >
              {t("vendor.login.applyHere")}
            </Link>
          </p>
          <p>
            {t("vendor.login.customerAccount")}{" "}
            <Link
              href="/auth/login"
              className="text-primary font-medium hover:underline"
            >
              {t("vendor.login.customerSignIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
