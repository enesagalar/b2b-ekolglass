import { redirect } from "next/navigation";

import { hasPermission, isKnownRole } from "@/domain/roles";
import { StockReportView } from "@/features/admin/stock-report-view";
import { requireAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStockPage({
  searchParams,
}: PageProps<"/admin/stok">) {
  const actor = await requireAdminUser();
  if (!isKnownRole(actor.role) || !hasPermission(actor.role, "stock.read.detailed")) {
    redirect("/admin");
  }

  return (
    <div className="grid min-w-0 gap-6">
      <StockReportView
        searchParams={await searchParams}
        canExport={hasPermission(actor.role, "stock.export")}
        basePath="/admin/stok"
        showOperations
      />
    </div>
  );
}
