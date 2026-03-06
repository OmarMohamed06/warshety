"use client";

/**
 * Providers — composites all client-side context providers.
 *
 * Keeping this in a dedicated "use client" file lets the root layout.tsx
 * remain a Server Component while still wrapping the entire tree with
 * client-only context (AuthContext, GarageContext, CartContext, etc.).
 */

import { AuthProvider } from "@/context/AuthContext";
import { GarageProvider } from "@/context/GarageContext";
import { CartProvider } from "@/context/CartContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GarageProvider>
        <CartProvider>{children}</CartProvider>
      </GarageProvider>
    </AuthProvider>
  );
}
