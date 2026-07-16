import { createHash } from "node:crypto";

import { hasPermission, isKnownRole } from "@/domain/roles";
import {
  buildStockReportCsv,
  InvalidStockReportFiltersError,
  resolveStockReportFilters,
  StockReportLimitError,
} from "@/domain/stock-reporting";
import { getAdminStockExportRows } from "@/data/admin-stock-reports";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { correlationHeaders, getCorrelationId, structuredLog } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedQueryKeys = new Set([
  "q",
  "warehouse",
  "status",
  "availability",
  "productStatus",
  "sort",
]);

function validateQueryKeys(searchParams: URLSearchParams) {
  for (const key of searchParams.keys()) {
    if (!allowedQueryKeys.has(key) || searchParams.getAll(key).length !== 1) {
      throw new InvalidStockReportFiltersError("Stok raporu sorgusu geçersizdir.");
    }
  }
}

export async function GET(request: Request) {
  const correlationId = getCorrelationId();
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Oturum gerekli." }, { status: 401 });
  if (
    !isKnownRole(user.role) ||
    !hasPermission(user.role, "stock.read.detailed") ||
    !hasPermission(user.role, "stock.export")
  ) {
    return Response.json({ message: "Bu raporu dışa aktarma yetkiniz yok." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    validateQueryKeys(url.searchParams);
    const filters = resolveStockReportFilters({
      q: url.searchParams.get("q") ?? undefined,
      warehouse: url.searchParams.get("warehouse") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      availability: url.searchParams.get("availability") ?? undefined,
      productStatus: url.searchParams.get("productStatus") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: "1",
    });
    const report = await getAdminStockExportRows(filters);
    const csv = buildStockReportCsv(report.rows);
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
    const fileName = `ekolglass-stok-${timestamp}.csv`;
    const checksum = createHash("sha256").update(csv).digest("hex");
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "report.stock.exported",
        entityType: "StockReport",
        metadata: JSON.stringify({
          rowCount: report.rows.length,
          snapshotAt: report.snapshotAt.toISOString(),
          fileName,
          sha256: checksum,
          q: filters.q || null,
          warehouse: filters.warehouse || null,
          status: filters.status,
          availability: filters.availability,
          productStatus: filters.productStatus,
          sort: filters.sort,
        }),
      },
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        ...correlationHeaders(correlationId),
      },
    });
  } catch (error) {
    if (error instanceof InvalidStockReportFiltersError) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof StockReportLimitError) {
      return Response.json({ message: error.message }, { status: 422 });
    }
    structuredLog("error", "report.stock_export.failed", { correlationId, error });
    return Response.json(
      { message: "Stok raporu oluşturulamadı.", correlationId },
      { status: 500, headers: correlationHeaders(correlationId) },
    );
  }
}
