"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronRight,
  DatabaseZap,
  FileText,
  Gauge,
  Home,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Settings,
  Truck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { logout } from "@/features/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { NavigationDrawer } from "@/components/navigation-drawer";
import {
  getRoleLabel,
  hasPermission,
  isKnownRole,
  type Permission,
} from "@/domain/roles";

type AdminNavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  description: string;
  permission?: Permission;
  anyPermissions?: Permission[];
  soon?: boolean;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const navigationSections: AdminNavSection[] = [
  {
    label: "Ana",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Operasyon merkezi",
        permission: "admin.dashboard.read",
      },
      {
        label: "Bayi Başvuruları",
        href: "/admin/bayi-basvurulari",
        icon: UsersRound,
        description: "Onay ve inceleme",
        permission: "dealer.application.review",
      },
      {
        label: "Firmalar",
        href: "/admin/firmalar",
        icon: Building2,
        description: "Bayi hesapları",
        permission: "company.manage",
      },
    ],
  },
  {
    label: "Ticaret",
    items: [
      {
        label: "Ürünler",
        href: "/admin/urunler",
        icon: PackageSearch,
        description: "Katalog ve teknik veri",
        permission: "product.read",
      },
      {
        label: "Yayın Hazırlığı",
        href: "/admin/urunler/yayin-hazirligi",
        icon: Layers3,
        description: "Yayın kontrolü",
        permission: "product.read",
      },
      {
        label: "Fiyat Listeleri",
        href: "/admin/urunler/fiyat-listeleri",
        icon: FileText,
        description: "Bayi fiyatları",
        permission: "price.read",
      },
      {
        label: "Siparişler",
        href: "/admin/siparisler",
        icon: DatabaseZap,
        description: "Onay ve durumlar",
        permission: "order.track",
      },
    ],
  },
  {
    label: "Operasyon",
    items: [
      {
        label: "Stok ve Depo",
        href: "/admin/raporlar?view=stock",
        icon: Boxes,
        description: "Stok riski ve hareketler",
        anyPermissions: ["report.read", "stock.read.detailed"],
      },
      {
        label: "Sevkiyat",
        icon: Truck,
        description: "Kargo ve takip",
        permission: "order.ship",
        soon: true,
      },
      {
        label: "Entegrasyonlar",
        href: "/admin/entegrasyonlar",
        icon: Gauge,
        description: "Kuyruk ve teslimat",
        permission: "integration.read",
      },
      {
        label: "Raporlar",
        href: "/admin/raporlar",
        icon: BarChart3,
        description: "Satış ve stok",
        anyPermissions: ["report.read", "stock.read.detailed"],
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        label: "İçerik ve Bannerlar",
        href: "/admin/icerik",
        icon: Layers3,
        description: "Banner ve içerik",
        permission: "admin.content.manage",
      },
      {
        label: "Ayarlar",
        icon: Settings,
        description: "Sistem yönetimi",
        permission: "admin.dashboard.read",
        soon: true,
      },
    ],
  },
];

function getVisibleNavigationSections(role: string) {
  if (!isKnownRole(role)) return [];
  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.permission
          ? hasPermission(role, item.permission)
          : item.anyPermissions?.some((permission) => hasPermission(role, permission)),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

function getActiveItem(pathname: string, role: string) {
  const items = getVisibleNavigationSections(role).flatMap((section) => section.items);

  return (
    items
      .filter((item) => item.href)
      .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))
      .find(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)),
      ) ?? items[0]
  );
}

function SidebarContent({
  role,
  activeHref,
  onNavigate,
}: {
  role: string;
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/7 px-4 py-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          <BrandLogo compact />
          <span>
            <span className="block text-sm font-semibold text-slate-950">EkolGlass</span>
            <span className="block text-xs text-slate-500">Operasyon Merkezi</span>
          </span>
        </Link>
      </div>

      <nav className="sidebar-scroll portal-nav-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="portal-nav-sections grid gap-5">
          {getVisibleNavigationSections(role).map((section) => (
            <section key={section.label}>
              <p className="px-2 text-[11px] font-semibold uppercase text-slate-400">
                {section.label}
              </p>
              <div className="mt-2 grid gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = Boolean(item.href) && item.href === activeHref;
                  const className = isActive
                    ? "portal-nav-item-active"
                    : item.soon
                      ? "text-slate-300"
                      : "portal-nav-item";

                  const content = (
                    <>
                      <Icon size={18} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className={`portal-nav-description block truncate text-xs ${isActive ? "text-[#337da5]" : "text-slate-400"}`}>
                          {item.description}
                        </span>
                      </span>
                      {item.soon ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400">
                          Yakında
                        </span>
                      ) : (
                        <ChevronRight size={15} aria-hidden="true" />
                      )}
                    </>
                  );

                  if (!item.href || item.soon) {
                    return (
                      <div
                        key={item.label}
                        aria-disabled="true"
                        className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 ${className}`}
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 transition ${className}`}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-black/7 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="portal-nav-item flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition"
        >
          <Home size={17} aria-hidden="true" />
          Public portala dön
        </Link>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeItem = useMemo(
    () => getActiveItem(pathname, user.role),
    [pathname, user.role],
  );
  const ActiveIcon = activeItem.icon;

  return (
    <div className="portal-shell min-h-screen text-[#1d1d1f]">
      <aside className="portal-sidebar fixed inset-y-3 left-3 z-30 hidden w-[252px] overflow-hidden rounded-[20px] xl:block">
        <SidebarContent role={user.role} activeHref={activeItem.href} />
      </aside>

      <NavigationDrawer
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        ariaLabel="Yönetim navigasyonu"
      >
        <SidebarContent
          role={user.role}
          activeHref={activeItem.href}
          onNavigate={() => setIsMobileMenuOpen(false)}
        />
      </NavigationDrawer>

      <div className="xl:pl-[276px]">
        <header className="portal-topbar sticky top-2 z-20 mx-2 rounded-2xl md:top-3 md:mx-3">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Menüyü aç"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/8 bg-white/74 text-slate-700 shadow-sm xl:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="hidden h-10 w-10 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a] md:flex">
                <ActiveIcon size={21} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#00639a]">
                  Operasyon merkezi
                </p>
                <h1 className="truncate text-xl font-semibold text-slate-950 md:text-2xl">
                  {activeItem.label}
                </h1>
                <p className="hidden text-sm text-slate-500 md:block">
                  {activeItem.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden min-w-0 border-r border-slate-200 pr-4 text-right md:block">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {getRoleLabel(user.role)}
                </p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  aria-label="Çıkış yap"
                  title="Çıkış yap"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <LogOut size={16} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="portal-workspace mx-auto w-full max-w-[1520px] px-4 py-7 md:px-7 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
