"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Parts seller accounts have been removed from this platform.
 * Redirect to the service-center vendor login.
 */
export default function PartsSellerLoginPage() {
  const router = useRouter();
  const { localePath } = useLanguage();

  useEffect(() => {
    router.replace(localePath("/vendor/login/service-center"));
  }, [router, localePath]);

  return null;
}
