import Link from "next/link";
import { BarChart3, Boxes } from "lucide-react";

export function ReportViewTabs({
  active,
  canViewSales,
  canViewStock,
}: {
  active: "sales" | "stock";
  canViewSales: boolean;
  canViewStock: boolean;
}) {
  const tabs = [
    canViewSales ? { key: "sales" as const, label: "Satış", href: "/admin/raporlar?view=sales", icon: BarChart3 } : null,
    canViewStock ? { key: "stock" as const, label: "Stok", href: "/admin/raporlar?view=stock", icon: Boxes } : null,
  ].filter((tab): tab is NonNullable<typeof tab> => tab !== null);

  return (
    <nav className="flex w-fit gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm" aria-label="Rapor görünümü">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold transition ${selected ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
          >
            <Icon size={16} /> {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
