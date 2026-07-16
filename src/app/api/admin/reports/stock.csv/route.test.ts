import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAdminStockExportRows: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/data/admin-stock-reports", () => ({
  getAdminStockExportRows: mocks.getAdminStockExportRows,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: mocks.auditCreate } },
}));

import { GET } from "./route";

beforeEach(() => {
  mocks.getCurrentUser.mockReset();
  mocks.getAdminStockExportRows.mockReset();
  mocks.auditCreate.mockReset();
});

describe("stock report CSV route", () => {
  it("rejects guests and roles without export permission", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const guest = await GET(new Request("http://localhost/api/admin/reports/stock.csv"));
    mocks.getCurrentUser.mockResolvedValueOnce({ id: "sales", role: "SALES_STAFF" });
    const sales = await GET(new Request("http://localhost/api/admin/reports/stock.csv"));

    expect(guest.status).toBe(401);
    expect(sales.status).toBe(403);
    expect(mocks.getAdminStockExportRows).not.toHaveBeenCalled();
  });

  it("exports the validated stock snapshot and writes a bounded audit record", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "warehouse-user", role: "WAREHOUSE_STAFF" });
    mocks.getAdminStockExportRows.mockResolvedValue({ snapshotAt: new Date("2026-07-16T10:05:00.000Z"), rows: [{
      productCode: "E037002",
      productName: "Ön Cam",
      categoryName: "Otomotiv",
      productStatus: "Aktif",
      warehouseCode: "MERKEZ",
      quantity: 10,
      reservedQuantity: 2,
      availableQuantity: 8,
      operationalStatusLabel: "Kullanılabilir",
      declaredStatusLabel: "Stokta",
      visibilityLabel: "Detaylı",
      ledgerStatusLabel: "Tutarlı",
      updatedAt: new Date("2026-07-16T10:00:00.000Z"),
      snapshotAt: new Date("2026-07-16T10:05:00.000Z"),
    }] });
    mocks.auditCreate.mockResolvedValue({ id: "audit" });

    const response = await GET(new Request(
      "http://localhost/api/admin/reports/stock.csv?warehouse=merkez&availability=AVAILABLE&productStatus=ACTIVE",
    ));
    const bodyBytes = new Uint8Array(await response.arrayBuffer());
    const body = new TextDecoder().decode(bodyBytes);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="ekolglass-stok-/);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect([...bodyBytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(body).toContain("E037002");
    expect(mocks.getAdminStockExportRows).toHaveBeenCalledWith(expect.objectContaining({
      warehouse: "MERKEZ",
      availability: "AVAILABLE",
      productStatus: "ACTIVE",
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "warehouse-user",
        action: "report.stock.exported",
        entityType: "StockReport",
      }),
    });
  });

  it("rejects invalid query values before reading report rows", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin", role: "ADMIN" });
    const response = await GET(new Request(
      "http://localhost/api/admin/reports/stock.csv?availability=UNKNOWN",
    ));
    expect(response.status).toBe(400);
    expect(mocks.getAdminStockExportRows).not.toHaveBeenCalled();
  });

  it("rejects duplicate or unknown query keys", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin", role: "ADMIN" });
    const duplicate = await GET(new Request(
      "http://localhost/api/admin/reports/stock.csv?status=IN_STOCK&status=LOW_STOCK",
    ));
    const unknown = await GET(new Request(
      "http://localhost/api/admin/reports/stock.csv?companyId=other-company",
    ));
    expect(duplicate.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(mocks.getAdminStockExportRows).not.toHaveBeenCalled();
  });

  it("hides database errors behind a controlled correlation id", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getCurrentUser.mockResolvedValue({ id: "admin", role: "ADMIN" });
    mocks.getAdminStockExportRows.mockRejectedValue(new Error("SQLITE secret path"));
    const response = await GET(new Request("http://localhost/api/admin/reports/stock.csv"));
    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload.message).toBe("Stok raporu oluşturulamadı.");
    expect(payload.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(payload)).not.toContain("SQLITE");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
