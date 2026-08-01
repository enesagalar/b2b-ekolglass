import {
  Boxes,
  CircleDollarSign,
  FileImage,
  History,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import type { AdminProductDetailTab } from "@/data/admin-product-detail";

const tabs = [
  { key: "genel", label: "Genel", icon: Boxes },
  { key: "stok", label: "Stok", icon: Warehouse },
  { key: "fiyat", label: "Fiyat", icon: CircleDollarSign },
  { key: "uyumluluk", label: "Uyumluluk", icon: ShieldCheck },
  { key: "medya", label: "Medya", icon: FileImage },
  { key: "audit", label: "Denetim", icon: History },
] satisfies Array<{
  key: AdminProductDetailTab;
  label: string;
  icon: typeof Boxes;
}>;

export function ProductDetailTabs({
  productId,
  activeTab,
  canReadPrice,
  canReadStock,
}: {
  productId: string;
  activeTab: AdminProductDetailTab;
  canReadPrice: boolean;
  canReadStock: boolean;
}) {
  const visibleTabs = tabs.filter(
    (tab) =>
      (tab.key !== "fiyat" || canReadPrice) &&
      (tab.key !== "stok" || canReadStock),
  );

  return (
    <nav
      aria-label="Ürün yönetimi bölümleri"
      className="scrollbar-hidden flex gap-2 overflow-x-auto border-b border-slate-200 pb-2"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <Link
            key={tab.key}
            href={`/admin/urunler/${productId}?tab=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
              isActive
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
