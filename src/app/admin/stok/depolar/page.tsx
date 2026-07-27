import {
  ArrowLeft,
  Boxes,
  Building2,
  ChevronDown,
  MapPin,
  PackageCheck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import { getAdminWarehouses } from "@/data/admin-warehouses";
import { WarehouseForm } from "@/features/warehouse-management/warehouse-form";
import { requirePermissionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminWarehousesPage() {
  await requirePermissionUser("warehouse.manage", "/admin/stok/depolar");
  const report = await getAdminWarehouses();

  return (
    <div className="grid gap-6">
      <section className="border-b border-slate-200 pb-5">
        <Link
          href="/admin/stok"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Stok merkezine dön
        </Link>
        <p className="mt-5 text-sm font-semibold text-teal-800">
          Depo ana verisi
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Depolar
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Stok hareketlerinde kullanılabilecek kontrollü depo kodlarını ve
          teslimat adreslerini yönetin. Kullanılmış depo kodları geçmişin
          bozulmaması için değiştirilemez.
        </p>
      </section>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Toplam depo",
            value: report.metrics.totalCount,
            detail: `${report.metrics.activeCount} aktif`,
            icon: Building2,
          },
          {
            label: "Fiziksel stok",
            value: report.metrics.physicalQuantity,
            detail: "Tüm depolardaki toplam",
            icon: Boxes,
          },
          {
            label: "Rezerve",
            value: report.metrics.reservedQuantity,
            detail: "Açık siparişlere ayrılan",
            icon: Warehouse,
          },
          {
            label: "Kullanılabilir",
            value:
              report.metrics.physicalQuantity -
              report.metrics.reservedQuantity,
            detail: "Transfer ve satışa uygun",
            icon: PackageCheck,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="border-b border-slate-200 p-4 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  {metric.label}
                </p>
                <Icon size={17} className="text-teal-800" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {metric.value.toLocaleString("tr-TR")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
            </article>
          );
        })}
      </section>

      <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <span>
            <span className="block font-semibold text-slate-950">
              Yeni depo oluştur
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Yeni bir stok konumu ve teslimat adresi tanımlayın.
            </span>
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 transition group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-slate-200 p-5">
          <WarehouseForm />
        </div>
      </details>

      <section className="grid gap-4">
        <div>
          <h3 className="font-semibold text-slate-950">Tanımlı depolar</h3>
          <p className="mt-1 text-sm text-slate-500">
            Her depo stok miktarı, adresi ve kullanım durumuyla birlikte
            gösterilir.
          </p>
        </div>
        {report.rows.map((warehouse) => (
          <details
            key={warehouse.id}
            className="group rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <summary className="grid cursor-pointer list-none gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(110px,0.25fr))_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">
                    {warehouse.name}
                  </p>
                  <span
                    className={
                      warehouse.isActive
                        ? "rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                    }
                  >
                    {warehouse.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-teal-800">
                  {warehouse.code}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={14} aria-hidden="true" />
                  {[warehouse.district, warehouse.city]
                    .filter(Boolean)
                    .join(" / ") || "Adres bilgisi girilmemiş"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stok kaydı</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {warehouse.stockRecordCount.toLocaleString("tr-TR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Fiziksel / rezerve</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {warehouse.physicalQuantity.toLocaleString("tr-TR")} /{" "}
                  {warehouse.reservedQuantity.toLocaleString("tr-TR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Kullanılabilir</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {warehouse.availableQuantity.toLocaleString("tr-TR")}
                </p>
              </div>
              <ChevronDown
                size={18}
                className="shrink-0 transition group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-slate-200 p-5">
              <WarehouseForm
                warehouse={{
                  id: warehouse.id,
                  code: warehouse.code,
                  name: warehouse.name,
                  isActive: warehouse.isActive,
                  addressLine: warehouse.addressLine,
                  district: warehouse.district,
                  city: warehouse.city,
                  postalCode: warehouse.postalCode,
                  countryCode: warehouse.countryCode,
                  updatedAt: warehouse.updatedAt.toISOString(),
                }}
              />
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
