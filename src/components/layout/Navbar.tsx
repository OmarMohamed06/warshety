"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { useAuth } from "@/context/AuthContext";

const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "ar", label: "AR", flag: "🇪🇬" },
] as const;

const NAV_LINKS = [
  { label: "Car Parts", href: "/parts", icon: "settings" },
  { label: "Service Centers", href: "/services", icon: "home_repair_service" },
  { label: "Offers", href: "#offers", icon: "local_offer" },
  { label: "Become a Vendor", href: "/vendor/apply", icon: "store" },
];

// ── Cart Drawer ────────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    items,
    cartCount,
    subtotal,
    shipping,
    discount,
    total,
    promo,
    changeQty,
    removeItem,
    applyPromo,
    removePromo,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);

  const handleApplyPromo = () => {
    const err = applyPromo(promoInput);
    setPromoError(err);
    if (!err) setPromoInput("");
  };

  // Trap focus / close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[440px] bg-white dark:bg-[#111621] z-[999] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#FF4B19]/10 rounded-xl flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[#FF4B19]"
                style={{ fontSize: "20px" }}
              >
                shopping_cart
              </span>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                My Cart
              </h2>
              <p className="text-xs text-slate-400">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span
              className="material-symbols-outlined text-slate-500"
              style={{ fontSize: "20px" }}
            >
              close
            </span>
          </button>
        </div>

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <span
                  className="material-symbols-outlined text-slate-400"
                  style={{ fontSize: "36px" }}
                >
                  shopping_cart
                </span>
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                Your cart is empty
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Browse parts and add them to your cart
              </p>
              <Link
                href="/parts"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#FF4B19] text-white text-sm font-bold rounded-xl hover:bg-[#e03d0f] transition-colors"
              >
                Browse Parts
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 bg-[#f6f6f8] dark:bg-slate-800/60 rounded-2xl p-4"
              >
                {/* Icon thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span
                    className="material-symbols-outlined text-[#FF4B19]"
                    style={{ fontSize: "26px" }}
                  >
                    {item.icon}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <span
                        className="material-symbols-outlined text-slate-400 hover:text-red-500 transition-colors"
                        style={{ fontSize: "16px" }}
                      >
                        delete
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {item.vendor}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                      {item.sku}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.badge === "OEM"
                            ? "bg-[#FF4B19]/10 text-[#FF4B19]"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-0.5">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "12px" }}
                      >
                        check_circle
                      </span>
                      Fits {item.compatible}
                    </span>
                  </div>

                  {/* Qty + Price */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          remove
                        </span>
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          add
                        </span>
                      </button>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      EGP {(item.price * item.qty).toLocaleString("en-EG")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer / Summary ── */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5 space-y-4 shrink-0 bg-white dark:bg-[#111621]">
            {/* Promo code */}
            {promo ? (
              <div className="flex items-center justify-between px-3 py-2 bg-[#FF4B19]/8 border border-[#FF4B19]/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[#FF4B19]"
                    style={{ fontSize: "16px" }}
                  >
                    local_offer
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#FF4B19]">
                      {promo.code}
                    </p>
                    <p className="text-[10px] text-slate-500">{promo.label}</p>
                  </div>
                </div>
                <button
                  onClick={removePromo}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px" }}
                  >
                    close
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value);
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    placeholder="Promo code"
                    className="flex-1 px-3 py-2 text-sm bg-[#f6f6f8] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-2 text-sm font-bold text-[#FF4B19] border border-[#FF4B19] rounded-xl hover:bg-[#FF4B19]/5 transition-colors whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-red-500">{promoError}</p>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold">
                  EGP {subtotal.toLocaleString("en-EG")}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-[#FF4B19]">
                  <span>Discount ({promo?.discountPct}%)</span>
                  <span className="font-semibold">
                    − EGP {discount.toLocaleString("en-EG")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Shipping</span>
                <span
                  className={`font-semibold ${
                    shipping === 0 ? "text-green-600 dark:text-green-400" : ""
                  }`}
                >
                  {shipping === 0 ? "Free" : `EGP ${shipping}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-slate-400">
                  Free shipping on orders above EGP 2,000
                </p>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-black text-slate-900 dark:text-white">
                  Total
                </span>
                <span className="font-black text-lg text-[#FF4B19]">
                  EGP {total.toLocaleString("en-EG")}
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/checkout"
              onClick={onClose}
              className="w-full h-13 bg-[#FF4B19] hover:bg-[#e03d0f] text-white font-black rounded-2xl shadow-lg shadow-[#FF4B19]/25 transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "20px" }}
              >
                lock
              </span>
              Proceed to Checkout
            </Link>

            <Link
              href="/parts"
              onClick={onClose}
              className="w-full text-center text-sm font-semibold text-slate-500 hover:text-[#FF4B19] transition-colors block"
            >
              Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function Navbar() {
  const { cartCount } = useCart();
  const { activeVehicle, vehicles, setActiveVehicle } = useGarage();
  const { user, vendor, role, signOut, isAuthenticated } = useAuth();
  const router = useRouter();

  const [lang, setLang] = useState<"en" | "ar">("en");
  const [langOpen, setLangOpen] = useState(false);
  const [garageDropdownOpen, setGarageDropdownOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const langRef = useRef<HTMLDivElement>(null);
  const garageRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (garageRef.current && !garageRef.current.contains(e.target as Node)) {
        setGarageDropdownOpen(false);
      }
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setCartOpen(false);
    setGarageDropdownOpen(false);
  }, [pathname]);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-[#111621] shadow-sm border-b border-slate-200 dark:border-slate-800">
        {/* ── Top Bar ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 h-16 flex items-center justify-start overflow-visible"
          >
            <img
              src="/motorlogo.png"
              alt="Garage Egypt"
              className="relative h-10 w-auto object-contain"
            />
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden sm:flex relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              style={{ fontSize: "20px" }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts, brands, SKU or VIN…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 focus:border-[#FF4B19]/40 transition"
            />
          </div>

          {/* Right Actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Language Toggle */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                aria-label="Switch language"
              >
                <span className="text-base leading-none">{current.flag}</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#FF4B19] transition-colors hidden sm:block">
                  {current.label}
                </span>
                <span
                  className="material-symbols-outlined text-slate-400 group-hover:text-[#FF4B19] transition-colors"
                  style={{ fontSize: "16px", lineHeight: 1 }}
                >
                  expand_more
                </span>
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[999]">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                        lang === l.code
                          ? "text-[#FF4B19]"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      {l.code === "en" ? "English" : "العربية"}
                      {lang === l.code && (
                        <span className="ml-auto text-[#FF4B19] text-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Account — auth-aware */}
            <div className="relative hidden sm:block" ref={accountRef}>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setAccountOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#FF4B19] flex items-center justify-center text-white font-black text-xs">
                      {(user?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight truncate max-w-[80px]">
                        {user?.full_name?.split(" ")[0] ?? "Account"}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight capitalize">
                        {role}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[14px]">
                      expand_more
                    </span>
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[999] py-1">
                      {role === "vendor" && (
                        <Link
                          href="/vendor/dashboard"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FF4B19] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            dashboard
                          </span>
                          Vendor Dashboard
                        </Link>
                      )}
                      {role === "admin" && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FF4B19] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            admin_panel_settings
                          </span>
                          Admin
                        </Link>
                      )}
                      <Link
                        href="/bookings"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_month
                        </span>
                        My Bookings
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          shopping_bag
                        </span>
                        My Orders
                      </Link>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      <button
                        onClick={async () => {
                          setAccountOpen(false);
                          await signOut();
                          router.push("/");
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          logout
                        </span>
                        Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <span
                    className="material-symbols-outlined text-slate-500 group-hover:text-[#FF4B19] transition-colors"
                    style={{ fontSize: "22px", lineHeight: 1 }}
                  >
                    account_circle
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">
                      Sign In
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      My Account
                    </p>
                  </div>
                </Link>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <span
                className="material-symbols-outlined text-slate-500 group-hover:text-[#FF4B19] transition-colors"
                style={{ fontSize: "24px", lineHeight: 1 }}
              >
                shopping_cart
              </span>
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] bg-[#FF4B19] text-white text-[10px] font-black rounded-full flex items-center justify-center px-[3px] shadow">
                  {cartCount}
                </span>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  Cart
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* My Garage dropdown */}
            <div className="relative" ref={garageRef}>
              <button
                onClick={() => setGarageDropdownOpen((o) => !o)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                aria-expanded={garageDropdownOpen}
                aria-label="My Garage"
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`material-symbols-outlined transition-colors ${
                      garageDropdownOpen
                        ? "text-[#FF4B19]"
                        : "text-slate-500 group-hover:text-[#FF4B19]"
                    }`}
                    style={{
                      fontSize: "26px",
                      lineHeight: 1,
                      display: "block",
                    }}
                  >
                    garage
                  </span>
                  {!activeVehicle && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-400 rounded-full flex items-center justify-center">
                      <span
                        className="text-white font-black"
                        style={{ fontSize: "9px" }}
                      >
                        !
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                    My Garage{" "}
                    <span
                      className={`text-slate-400 inline-block transition-transform duration-200 ${
                        garageDropdownOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight truncate max-w-[110px]">
                    {activeVehicle
                      ? vehicleLabel(activeVehicle)
                      : "Select your vehicle"}
                  </p>
                </div>
              </button>

              {/* Dropdown panel */}
              {garageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[999]">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      My Garage
                    </span>
                    <Link
                      href="/garage"
                      onClick={() => setGarageDropdownOpen(false)}
                      className="text-xs font-bold text-[#FF4B19] hover:underline flex items-center gap-0.5"
                    >
                      Manage
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "13px" }}
                      >
                        arrow_forward
                      </span>
                    </Link>
                  </div>

                  {/* Vehicle list */}
                  {vehicles.length === 0 ? (
                    /* Empty state */
                    <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-slate-400"
                          style={{ fontSize: "24px" }}
                        >
                          garage
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          No vehicles saved
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Add your car to filter compatible parts
                        </p>
                      </div>
                      <Link
                        href="/garage"
                        onClick={() => setGarageDropdownOpen(false)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FF4B19] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "14px" }}
                        >
                          add
                        </span>
                        Add Vehicle
                      </Link>
                    </div>
                  ) : (
                    <div className="py-2 max-h-72 overflow-y-auto">
                      {vehicles.map((v) => {
                        const isActive = activeVehicle?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => {
                              setActiveVehicle(v.id);
                              setGarageDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              isActive
                                ? "bg-[#FF4B19]/6 dark:bg-[#FF4B19]/10"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            {/* Active indicator / radio */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                isActive
                                  ? "border-[#FF4B19] bg-[#FF4B19]"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>

                            {/* Vehicle info */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-bold leading-snug truncate ${
                                  isActive
                                    ? "text-[#FF4B19]"
                                    : "text-slate-800 dark:text-slate-100"
                                }`}
                              >
                                {v.year} {v.brand} {v.model}
                              </p>
                              {(v.trim || v.engineCode) && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  {[v.trim, v.engineCode]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>

                            {isActive && (
                              <span
                                className="material-symbols-outlined text-[#FF4B19] shrink-0"
                                style={{ fontSize: "16px" }}
                              >
                                check_circle
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer — add vehicle shortcut */}
                  {vehicles.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        href="/garage"
                        onClick={() => setGarageDropdownOpen(false)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#FF4B19] transition-colors"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "15px" }}
                        >
                          add_circle
                        </span>
                        Add another vehicle
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="ml-1 flex sm:hidden items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              <span
                className="material-symbols-outlined text-slate-600 dark:text-slate-300"
                style={{ fontSize: "24px" }}
              >
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown Menu ── */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111621] px-4 py-3 flex flex-col gap-1">
            {/* Mobile Search */}
            <div className="relative mb-2">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                style={{ fontSize: "20px" }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parts, brands, SKU or VIN…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF4B19]/30 transition"
              />
            </div>

            {/* Mobile Nav Links */}
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href !== "#offers" &&
                pathname.startsWith(link.href) &&
                link.href !== "/";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-[#FF4B19] bg-[#FF4B19]/8"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1 }}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Sign In */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {isAuthenticated ? (
                <>
                  {role === "vendor" && (
                    <Link
                      href="/vendor/dashboard"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#FF4B19] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px", lineHeight: 1 }}
                      >
                        dashboard
                      </span>
                      Vendor Dashboard
                    </Link>
                  )}
                  <Link
                    href="/bookings"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px", lineHeight: 1 }}
                    >
                      calendar_month
                    </span>
                    My Bookings
                  </Link>
                  <Link
                    href="/orders"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px", lineHeight: 1 }}
                    >
                      shopping_bag
                    </span>
                    My Orders
                  </Link>
                  <button
                    onClick={async () => {
                      await signOut();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px", lineHeight: 1 }}
                    >
                      logout
                    </span>
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", lineHeight: 1 }}
                  >
                    account_circle
                  </span>
                  Sign In / My Account
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Secondary Nav Bar (not sticky) ── */}
      <div className="hidden sm:block border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111621]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 h-11 overflow-x-auto scrollbar-hide">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href !== "#offers" &&
                pathname.startsWith(link.href) &&
                link.href !== "/";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-[#FF4B19] bg-[#FF4B19]/8"
                      : "text-slate-600 dark:text-slate-300 hover:text-[#FF4B19] hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "16px", lineHeight: 1 }}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                  {isActive && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-[#FF4B19]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
