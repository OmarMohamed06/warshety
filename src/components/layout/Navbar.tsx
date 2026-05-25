"use client";

import { LocaleLink as Link } from "@/components/ui/locale-link";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGarage, vehicleLabel } from "@/context/GarageContext";
import { useAuth } from "@/context/AuthContext";
import { globalSearch, type SearchResult } from "@/services/searchService";

import { useLanguage } from "@/context/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  ChevronDown,
  Car,
  CheckCircle2,
  PlusCircle,
  Plus,
  LayoutDashboard,
  CalendarDays,
  LogOut,
  UserCircle2,
  ShieldCheck,
  Wrench,
  Menu,
  X,
  ArrowRight,
  Store,
  Home,
  MoreHorizontal,
  Globe,
  ChevronRight,
  Gift,
  ClipboardList,
} from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "ar", label: "AR", flag: "🇪🇬" },
] as const;

const NAV_LINKS = [
  {
    tKey: "nav.serviceCenters",
    href: "/services",
    icon: <Wrench className="w-4 h-4" />,
  },
  {
    tKey: "nav.rewards",
    href: "/rewards",
    icon: <Gift className="w-4 h-4" />,
  },
  {
    tKey: "nav.becomeVendor",
    href: "/vendor/apply",
    icon: <Store className="w-4 h-4" />,
  },
];

// ── Search Box ────────────────────────────────────────────────────────────────
function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await globalSearch(q);
      setResults(res.slice(0, 8));
      setOpen(res.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(`/${locale}${href}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && results[activeIdx])
        navigate(results[activeIdx].href);
      else if (query.trim()) {
        setOpen(false);
        router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const typeIcon: Record<string, string> = {
    vendor: "🏪",
    service: "🔧",
    part: "⚙️",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIdx(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={t("nav.searchPlaceholder")}
        className="pl-9 rtl:pl-3 rtl:pr-9 bg-muted border-transparent focus-visible:ring-primary/30 w-full"
      />
      {query.length > 0 && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-xl z-50 overflow-hidden max-h-[380px] overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
              {locale === "ar" ? "جاري البحث..." : "Searching..."}
            </div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {locale === "ar" ? "لا توجد نتائج" : "No results found"}
            </div>
          )}
          {!loading &&
            results.map((r, idx) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => navigate(r.href)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors ${idx === activeIdx ? "bg-muted" : "hover:bg-muted/60"}`}
              >
                {r.image ? (
                  <img
                    src={r.image}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover shrink-0 bg-muted"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                    {typeIcon[r.type]}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.subtitle}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rtl:rotate-180 shrink-0" />
              </button>
            ))}
          {!loading && results.length > 0 && (
            <button
              onClick={() => {
                setOpen(false);
                router.push(
                  `/${locale}/search?q=${encodeURIComponent(query.trim())}`,
                );
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-primary border-t hover:bg-muted/50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              {locale === "ar"
                ? `عرض كل نتائج "${query}"`
                : `See all results for "${query}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { activeVehicle, vehicles, setActiveVehicle } = useGarage();
  const {
    user,
    role,
    signOut,
    isAuthenticated,
    managedBranchId,
    isLoading: authLoading,
  } = useAuth();
  const router = useRouter();

  const { locale, t, setLocale, localePath } = useLanguage();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const pathname = usePathname();

  // Close drawers on route change
  useEffect(() => {
    setMoreSheetOpen(false);
  }, [pathname]);

  const current = LANGUAGES.find((l) => l.code === locale)!;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background">
        {/* ── Top Bar ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link
            href={localePath("/")}
            className="shrink-0 h-16 flex items-center"
          >
            <img
              src="/warshety-nav.svg"
              alt="Warshety Logo"
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* Search Bar — desktop */}
          <div className="flex-1 max-w-xl hidden sm:flex">
            <SearchBox className="w-full" />
          </div>

          {/* Right Actions */}
          <div className="ms-auto flex items-center gap-1">
            {/* Language Toggle — globe only on mobile, flag+label on desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex sm:hidden w-9 h-9"
                  aria-label={t("nav.language")}
                >
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 sm:hidden">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLocale(l.code)}
                    className={
                      locale === l.code ? "text-primary font-bold" : ""
                    }
                  >
                    <span className="text-base mr-2">{l.flag}</span>
                    {l.code === "en" ? "English" : "العربية"}
                    {locale === l.code && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-2.5 hidden sm:flex"
                >
                  <span className="text-base leading-none">{current.flag}</span>
                  <span className="text-xs font-bold">{current.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLocale(l.code)}
                    className={
                      locale === l.code ? "text-primary font-bold" : ""
                    }
                  >
                    <span className="text-base mr-2">{l.flag}</span>
                    {l.code === "en" ? "English" : "العربية"}
                    {locale === l.code && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator
              orientation="vertical"
              className="h-7 hidden sm:block mx-1"
            />

            {/* Account */}
            <div className="hidden sm:block">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 px-2.5">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black">
                          {(user?.full_name ??
                            user?.email ??
                            "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left rtl:text-right hidden md:block">
                        <p className="text-xs font-bold leading-tight truncate max-w-[80px]">
                          {user?.full_name?.split(" ")[0] ?? "Account"}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                          {role}
                        </p>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {role === "vendor" && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/vendor/dashboard"
                          className="text-primary font-semibold"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          {t("nav.vendorDashboard")}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin/dashboard"
                          className="text-primary font-semibold"
                        >
                          <ShieldCheck className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                          {t("nav.admin")}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {role === "manager" && (managedBranchId || authLoading) && (
                      <DropdownMenuItem
                        asChild={!!managedBranchId}
                        disabled={!managedBranchId}
                      >
                        {managedBranchId ? (
                          <Link
                            href={`/branch/${managedBranchId}`}
                            className="text-primary font-semibold"
                          >
                            <Store className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                            Branch Management
                          </Link>
                        ) : (
                          <span className="flex items-center text-muted-foreground">
                            <Store className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                            Branch Management
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/bookings">
                        <CalendarDays className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                        {t("nav.myBookings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/rewards"
                        className="text-orange-500 font-semibold"
                      >
                        <Gift className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                        {t("nav.rewards")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={async () => {
                        await signOut();
                        window.location.href = localePath("/");
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                      {t("nav.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-2.5"
                >
                  <Link href="/auth/login">
                    <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left rtl:text-right">
                      <p className="text-xs font-bold leading-tight">
                        {t("nav.signIn")}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {t("nav.myAccount")}
                      </p>
                    </div>
                  </Link>
                </Button>
              )}
            </div>

            <Separator
              orientation="vertical"
              className="h-7 hidden sm:block mx-1"
            />

            {/* My Garage dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2.5">
                  <div className="relative">
                    <Car
                      className={`w-5 h-5 ${activeVehicle ? "text-muted-foreground" : "text-primary"}`}
                    />
                    {!activeVehicle && (
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-orange-400 rounded-full flex items-center justify-center">
                        <span
                          className="text-white font-black"
                          style={{ fontSize: "7px" }}
                        >
                          !
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-left rtl:text-right hidden sm:block">
                    <p className="text-xs font-bold leading-tight flex items-center gap-1">
                      {t("nav.myGarage")}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[110px]">
                      {activeVehicle
                        ? vehicleLabel(activeVehicle)
                        : t("nav.selectVehicle")}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {t("nav.myGarage")}
                  </span>
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                  >
                    <Link href="/garage">
                      {t("nav.manage")}{" "}
                      <ArrowRight className="w-3 h-3 ml-0.5 rtl:rotate-180" />
                    </Link>
                  </Button>
                </div>

                {vehicles.length === 0 ? (
                  <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t("nav.noVehicles")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("nav.noVehiclesDesc")}
                      </p>
                    </div>
                    <Button asChild size="sm" className="gap-1.5">
                      <Link href="/garage">
                        <Plus className="w-3.5 h-3.5" />
                        {t("nav.addVehicle")}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {vehicles.map((v) => {
                        const isActive = activeVehicle?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setActiveVehicle(v.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-start transition-colors ${
                              isActive
                                ? "bg-primary/[0.06] dark:bg-primary/10"
                                : "hover:bg-muted/60"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                isActive
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-bold leading-snug truncate ${isActive ? "text-primary" : ""}`}
                              >
                                {v.year} {v.brand} {v.model}
                              </p>
                              {(v.trim || v.engineCode) && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {[v.trim, v.engineCode]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            {isActive && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 border-t">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-primary w-full justify-start"
                      >
                        <Link href="/garage">
                          <PlusCircle className="w-4 h-4" />
                          {t("nav.addAnotherVehicle")}
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Secondary Nav Bar (desktop only, not sticky) ── */}
      <div className="hidden sm:block bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1 h-11 overflow-x-auto">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href !== "/" &&
                (link.href === pathname || pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-primary bg-primary/[0.08]"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  {link.icon}
                  {t(link.tKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Mobile Bottom App Navbar ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)] flex items-stretch h-[62px]">
        {/* Home */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            pathname === "/" || pathname === `/${locale}`
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          {t("nav.home")}
        </Link>

        {/* Services */}
        <Link
          href="/services"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            pathname.includes("/services")
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <Wrench className="w-5 h-5" />
          {t("nav.services")}
        </Link>

        {/* Rewards */}
        <Link
          href="/rewards"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground relative"
        >
          <div className="relative -mt-5 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Gift className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className={`mt-0.5 ${pathname.includes("/rewards") ? "text-primary font-bold" : ""}`}>
            {t("nav.rewards")}
          </span>
        </Link>

        {/* My Bookings */}
        <Link
          href="/bookings"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            pathname.includes("/bookings")
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          {t("nav.myBookings")}
        </Link>

        {/* More */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          {t("nav.more")}
        </button>
      </nav>

      {/* ── More Sheet (mobile) ── */}
      <Sheet
        open={moreSheetOpen}
        onOpenChange={(v) => !v && setMoreSheetOpen(false)}
      >
        <SheetContent
          side="bottom"
          className="sm:hidden rounded-t-2xl p-0 max-h-[92dvh] flex flex-col"
        >
          <SheetTitle className="sr-only">{t("nav.more")}</SheetTitle>
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Auth Card */}
          <div className="px-4 pb-3 border-b shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 py-2">
                <Avatar className="w-11 h-11">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-black">
                    {(user?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {user?.full_name ?? user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {role}
                  </p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMoreSheetOpen(false)}
                  className="text-xs text-primary font-semibold flex items-center gap-0.5"
                >
                  {t("nav.myAccount")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {t("nav.signInPrompt")}
                </p>
                <Button asChild className="w-full font-bold" size="lg">
                  <Link
                    href="/auth/login"
                    onClick={() => setMoreSheetOpen(false)}
                  >
                    {t("nav.signIn")} / {t("nav.signUp")}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1 px-2 py-2">
            {/* Mobile Search */}
            <div className="px-2 pb-3">
              <SearchBox className="w-full" />
            </div>
            {/* Main links grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                {
                  href: "/garage",
                  icon: <Car className="w-6 h-6" />,
                  tKey: "nav.myGarage",
                  color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
                },
                {
                  href: "/bookings",
                  icon: <CalendarDays className="w-6 h-6" />,
                  tKey: "nav.myBookings",
                  color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
                },
                {
                  href: "/rewards",
                  icon: <Gift className="w-6 h-6" />,
                  tKey: "nav.rewards",
                  color: "text-orange-500 bg-orange-50 dark:bg-orange-950/40",
                },
                {
                  href: "/services",
                  icon: <Wrench className="w-6 h-6" />,
                  tKey: "nav.serviceCenters",
                  color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
                },
                {
                  href: "/vendor/apply",
                  icon: <Store className="w-6 h-6" />,
                  tKey: "nav.becomeVendor",
                  color: "text-primary bg-primary/10",
                },
                ...(role === "vendor"
                  ? [
                      {
                        href: "/vendor/dashboard",
                        icon: <LayoutDashboard className="w-6 h-6" />,
                        tKey: "nav.vendorDashboard",
                        color: "text-primary bg-primary/10",
                      },
                    ]
                  : []),
                ...(role === "admin"
                  ? [
                      {
                        href: "/admin/dashboard",
                        icon: <ShieldCheck className="w-6 h-6" />,
                        tKey: "nav.admin",
                        color: "text-red-500 bg-red-50 dark:bg-red-950/40",
                      },
                    ]
                  : []),
                ...(role === "manager" && (managedBranchId || authLoading)
                  ? [
                      {
                        href: managedBranchId
                          ? `/branch/${managedBranchId}`
                          : "#",
                        icon: <Store className="w-6 h-6" />,
                        tKey: "nav.branchManagement" as const,
                        color: "text-primary bg-primary/10",
                      },
                    ]
                  : []),
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold leading-snug">
                    {t(item.tKey)}
                  </span>
                </Link>
              ))}
            </div>

            <Separator className="my-2" />

            {/* Language */}
            <div className="mb-3">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("nav.language")}
              </p>
              <div className="flex gap-2 px-2 py-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLocale(l.code);
                      setMoreSheetOpen(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      locale === l.code
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{l.flag}</span>
                    {l.code === "en" ? "English" : "العربية"}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            {isAuthenticated && (
              <button
                onClick={async () => {
                  await signOut();
                  window.location.href = localePath("/");
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t("nav.signOut")}
              </button>
            )}
          </div>

          {/* Bottom safe area padding */}
          <div className="h-4 shrink-0" />
        </SheetContent>
      </Sheet>
    </>
  );
}
