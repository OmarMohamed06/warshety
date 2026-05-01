"use client";

/**
 * Providers — composites all client-side context providers.
 *
 * Keeping this in a dedicated "use client" file lets the root layout.tsx
 * remain a Server Component while still wrapping the entire tree with
 * client-only context (AuthContext, GarageContext, CartContext, etc.).
 *
 * Navbar and Footer are rendered HERE (not passed as children from a Server
 * Component) so that React's useId fiber paths are consistent between SSR
 * and client hydration — preventing Base UI ID mismatches.
 */

import { AuthProvider } from "@/context/AuthContext";
import { GarageProvider } from "@/context/GarageContext";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider, type Locale } from "@/context/LanguageContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <LanguageProvider defaultLocale={locale}>
      <AuthProvider>
        <GarageProvider>
          <CartProvider>
            <Navbar />
            {/* pb-[62px] on mobile to clear the fixed bottom navbar */}
            <div className="pb-[62px] sm:pb-0">{children}</div>
            <Footer />
            <Toaster richColors position="top-center" />
          </CartProvider>
        </GarageProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
