import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

const activeClass =
  "inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const disabledClass =
  "inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-300";

export function ListPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  ariaLabel,
}: {
  page: number;
  totalPages: number;
  previousHref: string;
  nextHref: string;
  ariaLabel: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <span aria-live="polite">Sayfa {page} / {totalPages}</span>
      <div className="grid grid-cols-2 gap-2">
        {page > 1 ? (
          <Link href={previousHref} className={activeClass}>
            <ArrowLeft size={15} aria-hidden="true" />
            Önceki
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ArrowLeft size={15} aria-hidden="true" />
            Önceki
          </span>
        )}
        {page < totalPages ? (
          <Link href={nextHref} className={activeClass}>
            Sonraki
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Sonraki
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
