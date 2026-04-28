"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LocaleLink as Link } from "@/components/ui/locale-link";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  CalendarCheck,
  Package,
  ShoppingCart,
  Warehouse,
  Settings,
  Menu,
  Bell,
  ExternalLink,
  LogOut,
  Search,
  Users,
  Star,
  ChevronRight,
  Receipt,
  GitBranch,
  MapPin,
} from "lucide-react";

// ── Nav definitions ────────────────────────────────────────────────────────────

const SHARED_TOP_DEFS = [
  { href: "/vendor/dashboard", icon: LayoutDashboard, key: "navDashboard" },
];

const SERVICE_CENTER_DEFS = [
  { href: "/vendor/bookings", icon: CalendarDays, key: "navBookings" },
  { href: "/vendor/branches", icon: GitBranch, key: "navBranches" },
  { href: "/vendor/services", icon: Wrench, key: "navServices" },
  { href: "/vendor/calendar", icon: CalendarCheck, key: "navCalendar" },
];

const PARTS_SELLER_DEFS = [
  { href: "/vendor/products", icon: Package, key: "navProducts" },
  { href: "/vendor/orders", icon: ShoppingCart, key: "navOrders" },
  { href: "/vendor/inventory", icon: Warehouse, key: "navInventory" },
];

const MANAGE_DEFS = [
  { href: "/vendor/customers", icon: Users, key: "navCustomers" },
  { href: "/vendor/reviews", icon: Star, key: "navReviews" },
  { href: "/vendor/billing", icon: Receipt, key: "navBilling" },
  { href: "/vendor/settings", icon: Settings, key: "navSettings" },
];

// ── Sidebar content (shared between desktop and Sheet) ────────────────────────

interface SidebarProps {
  onNavigate?: () => void;
}

// Owner-only routes that branch managers should not see
const OWNER_ONLY_HREFS = [
  "/vendor/branches",
  "/vendor/billing",
  "/vendor/settings",
];

function SidebarContent({ onNavigate }: SidebarProps) {
  const { user, vendor, vendorType, role, managedBranchId, signOut } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { localePath, t } = useLanguage();

  const isManager = role === "manager";

  const dynamicItems = (
    vendorType === "service_center"
      ? SERVICE_CENTER_DEFS
      : vendorType === "parts_seller"
        ? PARTS_SELLER_DEFS
        : []
  )
    .filter((d) => !isManager || !OWNER_ONLY_HREFS.includes(d.href))
    .map((d) => ({ ...d, label: t(`vendor.${d.key}`) }));

  const dynamicLabel =
    vendorType === "service_center"
      ? t("vendor.navGroupService")
      : vendorType === "parts_seller"
        ? t("vendor.navGroupStore")
        : "";

  const sharedTop = SHARED_TOP_DEFS.map((d) => ({
    ...d,
    label: t(`vendor.${d.key}`),
  }));
  const manageItems = MANAGE_DEFS.filter(
    (d) => !isManager || !OWNER_ONLY_HREFS.includes(d.href),
  ).map((d) => ({ ...d, label: t(`vendor.${d.key}`) }));

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
    router.replace(localePath("/auth/login"));
  };

  const initials = (vendor?.business_name ?? user?.full_name ?? "V")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function NavItem({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
  }) {
    const resolved = localePath(href);
    const active = pathname === resolved || pathname.startsWith(resolved + "/");
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="h-3 w-3 opacity-60" />}
      </Link>
    );
  }

  function NavGroup({
    label,
    items,
  }: {
    label: string;
    items: Array<{ href: string; icon: React.ElementType; label: string }>;
  }) {
    return (
      <>
        <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Vendor type badge */}
      {vendorType && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              vendorType === "service_center"
                ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                : "border-primary/30 text-primary bg-primary/5",
            )}
          >
            {vendorType === "service_center"
              ? t("vendor.navServiceCenterBadge")
              : t("vendor.navPartsSellerBadge")}
          </Badge>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {sharedTop.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}

        {/* Branch manager shortcut */}
        {isManager && managedBranchId && (
          <NavItem
            href={`/branch/${managedBranchId}`}
            icon={MapPin}
            label={t("vendor.myBranch")}
          />
        )}

        {dynamicItems.length > 0 && (
          <NavGroup label={dynamicLabel} items={dynamicItems} />
        )}

        <NavGroup label={t("vendor.navGroupManage")} items={manageItems} />
      </nav>

      <Separator />

      {/* User card */}
      <div className="p-3 shrink-0">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted p-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">
              {vendor?.business_name ?? user?.full_name ?? "Vendor"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {vendor?.city ?? user?.email ?? ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            title={t("vendor.navSignOut")}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────────

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { vendor, vendorType } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 gap-0"
          showCloseButton={false}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b bg-background flex items-center gap-3 px-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 max-w-sm relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 bg-muted border-transparent text-sm"
              placeholder={
                vendorType === "service_center"
                  ? t("vendor.navSearchBookings")
                  : t("vendor.navSearchProducts")
              }
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 hidden sm:flex"
              asChild
            >
              <Link href="/" target="_blank" locale={false}>
                <ExternalLink className="h-3.5 w-3.5" />
                {t("vendor.navViewStore")}
              </Link>
            </Button>
          </div>
        </header>

        {/* Status banners */}
        {vendor?.status === "suspended" && (
          <div className="bg-destructive text-destructive-foreground text-xs text-center py-2 font-semibold px-4 shrink-0">
            {t("vendor.bannerSuspended")}
          </div>
        )}
        {vendor?.status === "pending" && (
          <div className="bg-amber-500 text-white text-xs text-center py-2 font-semibold px-4 shrink-0">
            {t("vendor.bannerPending")}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
