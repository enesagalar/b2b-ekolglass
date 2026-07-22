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
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { logout } from "@/features/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
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
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="material-dark flex h-full flex-col text-white lg:rounded-r-2xl">
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3"
        >
          <BrandLogo compact inverse />
          <span>
            <span className="block text-sm font-semibold">EkolGlass</span>
            <span className="block text-xs text-white/50">Operasyon Merkezi</span>
          </span>
        </Link>
      </div>

      <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-5">
          {getVisibleNavigationSections(role).map((section) => (
            <section key={section.label}>
              <p className="px-2 text-xs font-semibold uppercase text-white/35">
                {section.label}
              </p>
              <div className="mt-2 grid gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    Boolean(item.href) &&
                    (pathname === item.href ||
                      (item.href !== "/admin" &&
                        pathname.startsWith(`${item.href}/`)));
                  const className = isActive
                    ? "bg-white/11 text-white"
                    : item.soon
                      ? "text-white/30"
                      : "text-white/68 hover:bg-white/7 hover:text-white";

                  const content = (
                    <>
                      <Icon size={18} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={
                            isActive
                              ? "block truncate text-xs text-white/55"
                              : "block truncate text-xs text-white/35"
                          }
                        >
                          {item.description}
                        </span>
                      </span>
                      {item.soon ? (
                        <span className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-400">
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
                        className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 ${className}`}
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
                      className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 transition ${className}`}
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

      <div className="border-t border-white/10 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white"
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] lg:block">
        <SidebarContent pathname={pathname} role={user.role} />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              role={user.role}
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 border-b border-black/8 bg-white/78 backdrop-blur-2xl">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Menüyü aç"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 lg:hidden"
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

        <main className="portal-workspace mx-auto w-full max-w-[1520px] px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
