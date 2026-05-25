"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

// ─── Nav structure ────────────────────────────────────────────────────────────
function getNavGroups(t: (k: string) => string, lang: string) {
  return [
    {
      label: t("admin.navOverview"),
      items: [
        {
          label: t("admin.navDashboard"),
          icon: "dashboard",
          href: `/${lang}/admin/dashboard`,
        },
      ],
    },
    {
      label: t("admin.navPeople"),
      items: [
        {
          label: t("admin.navUsers"),
          icon: "group",
          href: `/${lang}/admin/users`,
        },
        {
          label: t("admin.navServiceCenters"),
          icon: "storefront",
          href: `/${lang}/admin/service-centers`,
        },
        {
          label: t("admin.navRoles"),
          icon: "admin_panel_settings",
          href: `/${lang}/admin/roles`,
        },
      ],
    },
    {
      label: t("admin.navCommerce"),
      items: [
        {
          label: t("admin.navBookings"),
          icon: "calendar_month",
          href: `/${lang}/admin/bookings`,
        },
        {
          label: t("admin.navPayments"),
          icon: "payments",
          href: `/${lang}/admin/payments`,
        },
        {
          label: "Rewards",
          icon: "redeem",
          href: `/${lang}/admin/rewards`,
        },
      ],
    },
    {
      label: t("admin.navQuality"),
      items: [
        {
          label: t("admin.navReviews"),
          icon: "star",
          href: `/${lang}/admin/reviews`,
        },
        {
          label: t("admin.navComplaints"),
          icon: "report",
          href: `/${lang}/admin/complaints`,
        },
      ],
    },
    {
      label: t("admin.navCatalog"),
      items: [
        {
          label: t("admin.navVehicles"),
          icon: "directions_car",
          href: `/${lang}/admin/vehicles`,
        },
      ],
    },
    {
      label: t("admin.navFinance"),
      items: [
        {
          label: t("admin.navPricing"),
          icon: "percent",
          href: `/${lang}/admin/pricing`,
        },
        {
          label: t("admin.navBilling"),
          icon: "receipt_long",
          href: `/${lang}/admin/billing`,
        },
      ],
    },
    {
      label: t("admin.navSystem"),
      items: [
        {
          label: t("admin.navNotifications"),
          icon: "notifications",
          href: `/${lang}/admin/notifications`,
        },
        {
          label: t("admin.navSettings"),
          icon: "settings",
          href: `/${lang}/admin/settings`,
        },
      ],
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, localePath } = useLanguage();
  const lang = locale;
  const NAV_GROUPS = getNavGroups(t, lang);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Guard: redirect non-admins / unauthenticated users
  useEffect(() => {
    if (!isLoading) {
      if (role === null) {
        router.replace(localePath("/auth/login"));
      } else if (role !== "admin") {
        router.replace(localePath("/"));
      }
    }
  }, [isLoading, role, router, localePath]);

  // Show spinner only while auth is still resolving
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f8] dark:bg-[#111621]">
        <span
          className="material-symbols-outlined animate-spin text-[#FF4B19]"
          style={{ fontSize: 40 }}
        >
          progress_activity
        </span>
      </div>
    );
  }
  // Redirect in-flight for non-admins — render nothing briefly
  if (role !== "admin") return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f8] dark:bg-[#111621]">
      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
          collapsed ? "w-16" : "w-60",
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0",
            collapsed && "justify-center",
          )}
        >
          <Link
            href={`/${lang}/admin/dashboard`}
            className="flex items-center gap-2 min-w-0"
          >
            <img
              src="/motorlogo.png"
              alt="Warshety"
              className="h-8 w-auto object-contain shrink-0"
            />
            {!collapsed && (
              <span className="text-xs font-black px-2 py-0.5 bg-[#FF4B19] text-white rounded-md whitespace-nowrap">
                ADMIN
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <span
              className="material-symbols-outlined text-slate-400"
              style={{ fontSize: 18 }}
            >
              {collapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-2 py-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              )}
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-semibold transition-colors",
                      active
                        ? "bg-[#FF4B19] text-white"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                      collapsed && "justify-center",
                    )}
                  >
                    <span
                      className="material-symbols-outlined shrink-0"
                      style={{ fontSize: 20 }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom user chip */}
        {!collapsed && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-3 shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#FF4B19] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-black">
                  {user?.email?.charAt(0).toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {user?.email ?? "Admin"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t("admin.superAdmin")}
                </p>
              </div>
              <Link href={`/${lang}`} className="shrink-0">
                <span
                  className="material-symbols-outlined text-slate-400 hover:text-[#FF4B19]"
                  style={{ fontSize: 18 }}
                >
                  logout
                </span>
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          collapsed ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        {/* Topbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shrink-0 z-10">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22 }}
            >
              menu
            </span>
          </button>
          <div className="flex-1" />
          <Link
            href={`/${lang}`}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#FF4B19] transition-colors font-semibold"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              open_in_new
            </span>
            {t("admin.viewSite")}
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
