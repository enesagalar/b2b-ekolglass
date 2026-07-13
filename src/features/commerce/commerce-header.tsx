import Link from "next/link";
import {
  Building2,
  Factory,
  FileText,
  LogIn,
  LogOut,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";

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

export function CommerceHeader({ identity }: { identity: CommerceIdentity }) {
  const productHref = "/urunler";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-950 text-slate-300">
        <div className="mx-auto flex min-h-8 max-w-[1440px] items-center justify-between px-4 text-xs md:px-6">
          <span>Otomotiv, otobüs, karavan ve özel üretim cam çözümleri</span>
          <span className="hidden sm:inline">
            Satış desteği · Türkiye geneli B2B hizmet
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-4 md:flex-nowrap md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="EkolGlass ana sayfa"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-800 text-white">
            <Factory size={22} aria-hidden="true" />
          </span>
          <span>
            <strong className="block text-lg leading-5 text-slate-950">
              EkolGlass
            </strong>
            <span className="text-xs text-slate-500">Camın Ekolü</span>
          </span>
        </Link>

        <form
          action={productHref}
          className="order-3 flex h-11 w-full min-w-0 items-center rounded-md border border-slate-300 bg-slate-50 focus-within:border-teal-700 md:order-none md:mx-5 md:flex-1"
        >
          <Search
            size={18}
            className="ml-3 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="q"
            placeholder="Ürün kodu, OEM, marka, model veya ölçü ara"
            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <button
            type="submit"
            aria-label="Ürün ara"
            className="flex h-10 w-11 shrink-0 items-center justify-center text-teal-800"
          >
            <PackageSearch size={19} aria-hidden="true" />
          </button>
        </form>

        {identity?.audience === "dealer" ? (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/bayi"
              className="hidden min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 lg:flex"
            >
              <Building2
                size={18}
                className="shrink-0 text-teal-800"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block max-w-40 truncate text-xs font-semibold text-slate-950">
                  {identity.companyName}
                </span>
                <span className="block text-[11px] text-slate-500">
                  Bayi hesabım
                </span>
              </span>
            </Link>
            <Link
              href="/bayi/hesabim"
              aria-label="Hesabım"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
            >
              <UserRound size={19} aria-hidden="true" />
            </Link>
            <Link
              href="/teklif-sepeti"
              aria-label="Teklif sepeti"
              title="Teklif sepeti"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
            >
              <FileText size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/sepet"
              aria-label="Sipariş sepeti"
              title="Sipariş sepeti"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
            >
              <ShoppingCart size={19} aria-hidden="true" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Çıkış yap"
                className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : identity?.audience === "admin" ? (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-800"
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Yönetim Paneli
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Çıkış yap"
                className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 text-slate-700"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/giris"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-800"
            >
              <LogIn size={17} aria-hidden="true" />
              Bayi Girişi
            </Link>
            <Link
              href="/bayi-basvurusu"
              className="hidden h-11 items-center rounded-md bg-teal-800 px-4 text-sm font-semibold text-white sm:inline-flex"
            >
              Bayi Ol
            </Link>
          </div>
        )}
      </div>

      <nav className="border-t border-slate-100" aria-label="Ana navigasyon">
        <div className="mx-auto flex min-h-11 max-w-[1440px] items-center gap-6 overflow-x-auto px-4 text-sm font-semibold text-slate-700 md:px-6">
          <Link
            href={productHref}
            className="whitespace-nowrap hover:text-teal-800"
          >
            Ürünler
          </Link>
          <Link
            href="/#cozumler"
            className="whitespace-nowrap hover:text-teal-800"
          >
            Çözümler
          </Link>
          <Link
            href="/#uretim"
            className="whitespace-nowrap hover:text-teal-800"
          >
            Üretim
          </Link>
          <Link
            href="/#kurumsal"
            className="whitespace-nowrap hover:text-teal-800"
          >
            Kurumsal
          </Link>
          <Link
            href="/#iletisim"
            className="whitespace-nowrap hover:text-teal-800"
          >
            İletişim
          </Link>
          {identity?.audience === "dealer" ? (
            <>
              <span
                className="h-5 w-px shrink-0 bg-slate-200"
                aria-hidden="true"
              />
              <Link
                href="/bayi/siparisler"
                className="whitespace-nowrap text-teal-800"
              >
                Siparişlerim
              </Link>
              <Link
                href="/bayi/teklifler"
                className="whitespace-nowrap text-teal-800"
              >
                Tekliflerim
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

export function CommerceFooter({ identity }: { identity: CommerceIdentity }) {
  return (
    <footer id="iletisim" className="bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-6">
        <div>
          <p className="text-lg font-semibold text-white">EkolGlass</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
            Otomotiv ve özel üretim cam çözümlerinde kurumsal satış, ürün keşfi
            ve bayi operasyonları.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Ürün Grupları</p>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/urunler">Otomotiv Camları</Link>
            <Link href="/urunler">Otobüs ve Minibüs</Link>
            <Link href="/urunler">Karavan ve Marine</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Hesap İşlemleri</p>
          <div className="mt-3 grid gap-2 text-sm">
            {identity?.audience === "dealer" ? (
              <>
                <Link href="/bayi">Bayi Panelim</Link>
                <Link href="/bayi/siparisler">Siparişlerim</Link>
                <Link href="/urunler">Ürün ve Fiyatlar</Link>
              </>
            ) : identity?.audience === "admin" ? (
              <>
                <Link href="/admin">Yönetim Paneli</Link>
                <Link href="/urunler">Ürünleri İncele</Link>
              </>
            ) : (
              <>
                <Link href="/giris">Bayi Girişi</Link>
                <Link href="/bayi-basvurusu">Bayi Başvurusu</Link>
                <Link href="/urunler">Ürünlerde Ara</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
