"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

/**
 * The parts-marketplace logistics feature has been removed.
 * Redirect admins to the bookings page which now serves as the
 * primary operational hub for service-center bookings.
 */
export default function LogisticsPage() {
  const router = useRouter();
  const { localePath } = useLanguage();

  useEffect(() => {
    router.replace(localePath("/admin/bookings"));
  }, [router, localePath]);

  return null;
}
