"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  FileClock,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { logout } from "@/features/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { NavigationDrawer } from "@/components/navigation-drawer";

type DealerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

const navigation: DealerNavItem[] = [
  { label: "Genel Bakış", href: "/bayi", icon: LayoutDashboard, description: "Firma operasyon özeti" },
  { label: "Ürünler", href: "/urunler", icon: PackageSearch, description: "Ürün, fiyat ve stok" },
  { label: "Sipariş Sepeti", href: "/sepet", icon: ShoppingBag, description: "Siparişe hazırlanan ürünler" },
  { label: "Siparişlerim", href: "/bayi/siparisler", icon: ClipboardList, description: "Sipariş ve sevkiyat" },
  { label: "Teklif Arşivi", href: "/bayi/teklifler", icon: FileClock, description: "Geçmiş özel üretim kayıtları" },
  { label: "Firma Hesabı", href: "/bayi/hesabim", icon: Building2, description: "Ticari ve iletişim bilgileri" },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/bayi" && pathname.startsWith(`${href}/`));
}

function DealerSidebar({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: (href: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/7 px-4 py-4">
        <Link href="/" onClick={() => onNavigate?.("/")} prefetch className="flex items-center gap-3">
          <BrandLogo compact />
          <span>
            <span className="block text-sm font-semibold text-slate-950">EkolGlass Bayi</span>
            <span className="block text-xs text-slate-500">Satış Portalı</span>
          </span>
        </Link>
      </div>

      <nav className="sidebar-scroll portal-nav-scroll min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label="Bayi portalı">
        <p className="px-2 text-[11px] font-semibold uppercase text-slate-400">Çalışma Alanı</p>
        <div className="mt-2 grid gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onNavigate?.(item.href)}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`flex min-h-13 items-center gap-3 rounded-xl px-3 py-2 transition ${
                  active ? "portal-nav-item-active" : "portal-nav-item"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className={`portal-nav-description block truncate text-xs ${active ? "text-[#337da5]" : "text-slate-400"}`}>{item.description}</span>
                </span>
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-black/7 p-4">
        <Link
          href="/"
          onClick={() => onNavigate?.("/")}
          prefetch
          className="portal-nav-item flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition"
        >
          <Home size={17} aria-hidden="true" />
          Ticaret ana sayfasına dön
        </Link>
      </div>
    </div>
  );
}

export function DealerShell({
  children,
  user,
  company,
}: {
  children: ReactNode;
  user: { name: string; role: string };
  company: { displayName: string; customerGroupName: string | null };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState<{
    href: string;
    fromPathname: string;
  } | null>(null);
  const activeItem = useMemo(
    () => navigation.find((item) => isItemActive(pathname, item.href)) ?? navigation[0],
    [pathname],
  );
  const ActiveIcon = activeItem.icon;

  const startNavigation = (href: string) => {
    if (href !== pathname) {
      setNavigationRequest({ href, fromPathname: pathname });
    }
  };
  const navigationPending =
    navigationRequest?.fromPathname === pathname &&
    navigationRequest.href !== pathname;

  return (
    <div className="portal-shell min-h-screen text-[#1d1d1f]">
      <aside className="portal-sidebar fixed inset-y-3 left-3 z-30 hidden w-[252px] overflow-hidden rounded-[20px] xl:block">
        <DealerSidebar pathname={pathname} onNavigate={startNavigation} />
      </aside>

      <NavigationDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ariaLabel="Bayi navigasyonu"
      >
        <DealerSidebar
          pathname={pathname}
          onNavigate={(href) => {
            startNavigation(href);
            setMobileOpen(false);
          }}
        />
      </NavigationDrawer>

      <div className="min-w-0 xl:pl-[276px]">
        <header
          className="portal-topbar sticky top-2 z-20 mx-2 overflow-hidden rounded-2xl md:top-3 md:mx-3"
          aria-busy={navigationPending}
        >
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Menüyü aç"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/8 bg-white/74 text-slate-700 shadow-sm xl:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eaf4fa] text-[#00639a] md:flex">
                <ActiveIcon size={21} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#00639a]">Bayi çalışma alanı</p>
                <h1 className="truncate text-xl font-semibold md:text-2xl">{activeItem.label}</h1>
                <p className="hidden text-sm text-slate-500 md:block">{activeItem.description}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden min-w-0 border-l border-slate-200 pl-4 md:block">
                <p className="max-w-52 truncate text-xs font-semibold text-slate-950">{company.displayName}</p>
                <p className="max-w-52 truncate text-[11px] text-slate-500">
                  {company.customerGroupName ?? "Bayi hesabı"} · {user.name}
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
          {navigationPending ? (
            <div className="route-progress-track rounded-none" aria-hidden="true">
              <span className="route-progress-bar" />
            </div>
          ) : null}
        </header>

        <main className="portal-workspace mx-auto w-full max-w-[1520px] px-4 py-7 md:px-7 md:py-9">{children}</main>
      </div>
    </div>
  );
}
