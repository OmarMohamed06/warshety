"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Navigation items per vendor type ─────────────────────────────────────────

const SHARED_TOP = [
  { href: "/vendor/dashboard", icon: "dashboard", label: "Dashboard" },
];

const SHARED_BOTTOM = [
  { href: "/vendor/settings", icon: "settings", label: "Settings" },
];

const SERVICE_CENTER_ITEMS = [
  { href: "/vendor/bookings", icon: "calendar_month", label: "Bookings" },
  { href: "/vendor/services", icon: "home_repair_service", label: "Services" },
  { href: "/vendor/calendar", icon: "event", label: "Calendar" },
];

const PARTS_SELLER_ITEMS = [
  { href: "/vendor/products", icon: "inventory_2", label: "Products" },
  { href: "/vendor/orders", icon: "shopping_cart", label: "Orders" },
  { href: "/vendor/inventory", icon: "warehouse", label: "Inventory" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, vendor, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const vendorType = vendor?.vendor_type;

  const dynamicItems =
    vendorType === "service_center"
      ? SERVICE_CENTER_ITEMS
      : vendorType === "parts_seller"
        ? PARTS_SELLER_ITEMS
        : [];

  const navItems = [...SHARED_TOP, ...dynamicItems, ...SHARED_BOTTOM];

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const initials = (vendor?.business_name ?? user?.full_name ?? "V")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const typeLabel =
    vendorType === "service_center"
      ? "Service Center"
      : vendorType === "parts_seller"
        ? "Parts Seller"
        : "Vendor";

  return (
    <div className="flex h-screen bg-[#f6f6f8] dark:bg-[#111621] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <Link href="/vendor/dashboard" className="flex items-center">
            <img
              src="/motorlogo.png"
              alt="Garage Egypt"
              className="h-16 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Vendor type badge */}
        {vendorType && (
          <div className="px-4 pt-4">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                vendorType === "service_center"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {vendorType === "service_center"
                  ? "home_repair_service"
                  : "inventory_2"}
              </span>
              {typeLabel}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#FF4B19] text-white shadow-lg shadow-[#FF4B19]/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FF4B19] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">
                {vendor?.business_name ?? user?.full_name ?? "Vendor"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {vendor?.city ?? user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              className="w-full bg-[#f6f6f8] dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF4B19]"
              placeholder={
                vendorType === "service_center"
                  ? "Search bookings, customers…"
                  : "Search products, orders…"
              }
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF4B19] rounded-full text-[9px] text-white flex items-center justify-center font-black">
                3
              </span>
            </button>
            <Link
              href="/"
              target="_blank"
              className="text-xs text-slate-500 hover:text-[#FF4B19] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                open_in_new
              </span>
              View store
            </Link>
          </div>
        </header>

        {/* Status banners */}
        {vendor?.status === "suspended" && (
          <div className="bg-red-500 text-white text-sm text-center py-2 font-semibold px-4">
            ⚠️ Your vendor account has been suspended. Contact support.
          </div>
        )}
        {vendor?.status === "pending" && (
          <div className="bg-amber-500 text-white text-sm text-center py-2 font-semibold px-4">
            ⏳ Your account is pending approval. Features will unlock once
            approved.
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
