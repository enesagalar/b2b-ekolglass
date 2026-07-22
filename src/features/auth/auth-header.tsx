import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

export function AuthHeader({ action }: { action?: { href: string; label: string } }) {
  return (
    <header className="px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="material-nav mx-auto flex min-h-[72px] max-w-[1180px] items-center justify-between gap-4 rounded-2xl px-3 sm:px-5">
        <Link href="/" aria-label="EkolGlass B2B ana sayfa"><BrandLogo /></Link>
        {action ? <Link href={action.href} className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-[#00639a] hover:bg-black/5">{action.label}</Link> : null}
      </div>
    </header>
  );
}
