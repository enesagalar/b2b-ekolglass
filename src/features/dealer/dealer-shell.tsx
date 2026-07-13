"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { logout } from "@/features/auth/actions";

type DealerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

const navigation: DealerNavItem[] = [
  { label: "Operasyon", href: "/bayi", icon: LayoutDashboard, description: "Firma operasyon özeti" },
  { label: "Ürün ve Fiyatlar", href: "/urunler", icon: PackageSearch, description: "Ticaret alanına geç" },
  { label: "Siparişlerim", href: "/bayi/siparisler", icon: ClipboardList, description: "Sipariş ve sevkiyat" },
  { label: "Firma Hesabı", href: "/bayi/hesabim", icon: Building2, description: "Ticari ve iletişim bilgileri" },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/bayi" && pathname.startsWith(`${href}/`));
}

function DealerSidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-400 text-slate-950">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold">EkolGlass</span>
            <span className="block text-xs text-slate-400">Bayi Operasyon Portalı</span>
          </span>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label="Bayi portalı">
        <p className="px-2 text-xs font-semibold uppercase text-slate-500">Çalışma Alanı</p>
        <div className="mt-2 grid gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex min-h-13 items-center gap-3 rounded-md px-3 py-2 transition ${
                  active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-slate-500">{item.description}</span>
                </span>
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
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
  const activeItem = useMemo(
    () => navigation.find((item) => isItemActive(pathname, item.href)) ?? navigation[0],
    [pathname],
  );
  const ActiveIcon = activeItem.icon;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] lg:block">
        <DealerSidebar pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[286px] max-w-[86vw] shadow-2xl">
            <button
              type="button"
              aria-label="Menüyü kapat"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <DealerSidebar pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Menüyü aç"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 lg:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800 ring-1 ring-teal-100 md:flex">
                <ActiveIcon size={21} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-teal-800">Bayi operasyon</p>
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
