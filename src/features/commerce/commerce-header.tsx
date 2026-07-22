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

import { BrandLogo } from "@/components/brand-logo";
import { logout } from "@/features/auth/actions";

export type CommerceIdentity =
  | {
      audience: "dealer";
      name: string;
      companyId: string;
      companyName: string;
    }
  | { audience: "admin"; name: string }
  | null;

function AccountActions({ identity }: { identity: CommerceIdentity }) {
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
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#303236] hover:bg-black/5"
        >
          <ShoppingBag size={19} aria-hidden="true" />
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
  return (
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="material-nav mx-auto max-w-[1480px] rounded-2xl">
        <div className="flex min-h-[72px] items-center gap-3 px-3 sm:px-5">
          <Link href="/" aria-label="EkolGlass B2B ana sayfa" className="shrink-0">
            <BrandLogo />
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
            <AccountActions identity={identity} />
          </div>

          <details className="group relative ml-auto lg:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-[#303236] hover:bg-black/5" aria-label="Menüyü aç">
              <Menu size={20} aria-hidden="true" />
            </summary>
            <div className="material-nav absolute right-0 top-14 w-[min(88vw,340px)] rounded-xl p-3 shadow-2xl">
              <form action="/urunler" className="flex h-11 items-center rounded-lg border border-[#d9dadd] bg-white">
                <Search size={17} className="ml-3 text-[#77777c]" aria-hidden="true" />
                <input name="q" aria-label="Ürün ara" placeholder="Ürün, OEM veya araç ara" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
              </form>
              <nav className="mt-2 grid" aria-label="Mobil navigasyon">
                <Link href="/" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Ana Sayfa</Link>
                <Link href="/urunler" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Ürünler</Link>
                {identity?.audience === "dealer" ? (
                  <>
                    <Link href="/bayi" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Bayi çalışma alanı</Link>
                    <Link href="/bayi/siparisler" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Siparişlerim</Link>
                    <Link href="/sepet" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Sipariş sepeti</Link>
                    <form action={logout}><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-black/5"><LogOut size={17} /> Çıkış yap</button></form>
                  </>
                ) : identity?.audience === "admin" ? (
                  <>
                    <Link href="/admin" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Yönetim paneli</Link>
                    <form action={logout}><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium hover:bg-black/5"><LogOut size={17} /> Çıkış yap</button></form>
                  </>
                ) : (
                  <>
                    <Link href="/giris" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Bayi Girişi</Link>
                    <Link href="/bayi-basvurusu" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-black/5">Bayi Başvurusu</Link>
                  </>
                )}
              </nav>
            </div>
          </details>
        </div>
      </div>
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
