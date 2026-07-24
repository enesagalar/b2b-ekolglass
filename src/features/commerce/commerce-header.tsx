"use client";

import Link from "next/link";
import {
  ExternalLink,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { NavigationDrawer } from "@/components/navigation-drawer";
import { logout } from "@/features/auth/actions";

export type CommerceIdentity =
  | {
      audience: "dealer";
      name: string;
      companyId: string;
      companyName: string;
      cartQuantity: number;
    }
  | { audience: "admin"; name: string }
  | null;

function AccountActions({
  identity,
  cartQuantity,
}: {
  identity: CommerceIdentity;
  cartQuantity: number;
}) {
  if (identity?.audience === "dealer") {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/bayi"
          className="hidden max-w-48 items-center gap-2 border-l border-[#d9dadd] px-3 py-1.5 text-sm font-medium text-[#1d1d1f] lg:flex"
        >
          <UserRound size={17} aria-hidden="true" />
          <span className="truncate">{identity.companyName}</span>
        </Link>
        <Link
          href="/sepet"
          aria-label="Sipariş sepeti"
          title="Sipariş sepeti"
          className="relative flex h-11 w-11 items-center justify-center rounded-lg text-[#303236] hover:bg-black/5"
        >
          <ShoppingBag size={19} aria-hidden="true" />
          {cartQuantity > 0 ? (
            <span
              className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#00639a] px-1 text-[10px] font-semibold leading-4 text-white"
              aria-label={`Sepette ${cartQuantity} ürün var`}
            >
              {cartQuantity > 99 ? "99+" : cartQuantity}
            </span>
          ) : null}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Çıkış yap"
            title="Çıkış yap"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#303236] hover:bg-black/5"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    );
  }

  if (identity?.audience === "admin") {
    return (
      <div className="flex items-center gap-1.5">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#1d1d1f] hover:bg-black/5"
        >
          <ShieldCheck size={17} aria-hidden="true" />
          <span className="hidden sm:inline">Yönetim</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Çıkış yap"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[#303236] hover:bg-black/5"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/giris"
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#00639a] px-4 text-sm font-semibold text-white hover:bg-[#004f7c]"
    >
      <LogIn size={17} aria-hidden="true" />
      <span className="hidden sm:inline">Bayi Girişi</span>
      <span className="sm:hidden">Giriş</span>
    </Link>
  );
}

export function CommerceHeader({ identity }: { identity: CommerceIdentity }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(
    identity?.audience === "dealer" ? identity.cartQuantity : 0,
  );

  useEffect(() => {
    if (identity?.audience !== "dealer") return;

    const updateCart = (event: Event) => {
      const quantity = (event as CustomEvent<{ quantity?: number }>).detail
        ?.quantity;
      if (typeof quantity === "number") setCartQuantity(quantity);
    };
    window.addEventListener("ekolglass:cart-updated", updateCart);
    return () =>
      window.removeEventListener("ekolglass:cart-updated", updateCart);
  }, [identity]);

  return (
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="material-nav mx-auto max-w-[1480px] rounded-[20px]">
        <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5">
          <Link href="/" aria-label="EkolGlass B2B ana sayfa" className="shrink-0">
            <BrandLogo className="commerce-header-logo" />
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Ana navigasyon">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-[#303236] hover:bg-black/5">
              Ana Sayfa
            </Link>
            <Link href="/urunler" className="rounded-lg px-3 py-2 text-sm font-medium text-[#303236] hover:bg-black/5">
              Ürünler
            </Link>
            {identity?.audience === "dealer" ? (
              <Link href="/bayi/siparisler" className="rounded-lg px-3 py-2 text-sm font-medium text-[#303236] hover:bg-black/5">
                Siparişlerim
              </Link>
            ) : null}
          </nav>

          <form
            action="/urunler"
            className="ml-auto hidden h-11 min-w-0 max-w-xl flex-1 items-center rounded-lg border border-[#d9dadd] bg-white/70 focus-within:border-[#00639a] lg:flex"
          >
            <Search size={17} className="ml-3 shrink-0 text-[#77777c]" aria-hidden="true" />
            <input
              name="q"
              placeholder="Ürün, OEM veya araç ara"
              aria-label="Ürün, OEM veya araç ara"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
            <button type="submit" aria-label="Ürün ara" className="flex h-10 w-10 items-center justify-center text-[#00639a]">
              <PackageSearch size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="ml-auto hidden sm:block lg:ml-2">
            <AccountActions
              identity={identity}
              cartQuantity={cartQuantity}
            />
          </div>

          <button
            type="button"
            aria-label="Menüyü aç"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-[#303236] hover:bg-black/5 lg:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <NavigationDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ariaLabel="Satış portalı navigasyonu"
      >
        <div className="flex h-full flex-col px-4 pb-5 pt-16">
          <Link href="/" onClick={() => setMobileOpen(false)} className="border-b border-black/7 pb-4">
            <BrandLogo />
          </Link>
          <form action="/urunler" className="mt-5 flex h-12 items-center rounded-xl border border-[#d9dadd] bg-white/86">
            <Search size={17} className="ml-3 text-[#77777c]" aria-hidden="true" />
            <input name="q" aria-label="Ürün ara" placeholder="Ürün, OEM veya araç ara" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
          </form>
          <nav className="mt-3 grid gap-1" aria-label="Mobil navigasyon">
            <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Ana Sayfa</Link>
            <Link href="/urunler" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Ürünler</Link>
            {identity?.audience === "dealer" ? (
              <>
                <Link href="/bayi" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Bayi çalışma alanı</Link>
                <Link href="/bayi/siparisler" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Siparişlerim</Link>
                <Link href="/sepet" onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">
                  Sipariş sepeti
                  {cartQuantity > 0 ? (
                    <span className="rounded-full bg-[#00639a] px-2 py-0.5 text-xs font-semibold text-white">
                      {cartQuantity}
                    </span>
                  ) : null}
                </Link>
                <form action={logout}><button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-white/72"><LogOut size={17} /> Çıkış yap</button></form>
              </>
            ) : identity?.audience === "admin" ? (
              <>
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Yönetim paneli</Link>
                <form action={logout}><button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-white/72"><LogOut size={17} /> Çıkış yap</button></form>
              </>
            ) : (
              <>
                <Link href="/giris" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Bayi Girişi</Link>
                <Link href="/bayi-basvurusu" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/72">Bayi Başvurusu</Link>
              </>
            )}
          </nav>
        </div>
      </NavigationDrawer>
    </header>
  );
}

export function CommerceFooter({ identity }: { identity: CommerceIdentity }) {
  return (
    <footer className="mt-16 border-t border-[#d9dadd] bg-white text-[#303236]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:px-6">
        <div>
          <BrandLogo />
          <p className="mt-1 max-w-md text-sm leading-6 text-[#68686d]">
            EkolGlass bayi ürün, fiyat, stok, sipariş ve sevkiyat portalı.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">Satış Portalı</p>
          <div className="mt-3 grid gap-2 text-sm text-[#68686d]">
            <Link href="/urunler" className="hover:text-[#00639a]">Ürünler</Link>
            {identity?.audience === "dealer" ? <Link href="/bayi/siparisler" className="hover:text-[#00639a]">Siparişlerim</Link> : <Link href="/giris" className="hover:text-[#00639a]">Bayi Girişi</Link>}
            <Link href="/bayi-basvurusu" className="hover:text-[#00639a]">Bayi Başvurusu</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">EkolGlass</p>
          <a href="https://www.ekolglass.com" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-[#68686d] hover:text-[#00639a]">
            Kurumsal web sitesi <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
