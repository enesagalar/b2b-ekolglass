import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const populatedCheckpoint =
  "20260713132436_add_order_cart_and_stock_reservations";

function insertLegacyReservation(db: Database.Database) {
  const now = "2026-07-13T12:00:00.000Z";
  db.exec(`
    INSERT INTO "Company" (
      "id", "legalName", "displayName", "email", "phone", "city", "updatedAt"
    ) VALUES (
      'migration-company', 'Migration Company', 'Migration Company',
      'migration@example.com', '1', 'Istanbul', '${now}'
    );
    INSERT INTO "ProductCategory" ("id", "slug", "name", "updatedAt")
    VALUES ('migration-category', 'migration-category', 'Migration Category', '${now}');
    INSERT INTO "Product" (
      "id", "code", "name", "categoryId", "glassType", "updatedAt"
    ) VALUES (
      'migration-product', 'MIGRATION-PRODUCT', 'Migration Product',
      'migration-category', 'Lamine', '${now}'
    );
    INSERT INTO "Order" (
      "id", "orderNumber", "companyId", "status", "updatedAt"
    ) VALUES (
      'migration-order', 'MIGRATION-ORDER', 'migration-company', 'SUBMITTED', '${now}'
    );
    INSERT INTO "OrderItem" (
      "id", "orderId", "productId", "quantity"
    ) VALUES (
      'migration-order-item', 'migration-order', 'migration-product', 2
    );
    INSERT INTO "StockItem" (
      "id", "productId", "warehouseCode", "quantity", "reservedQuantity", "updatedAt"
    ) VALUES (
      'migration-stock', 'migration-product', 'MERKEZ', 5, 2, '${now}'
    );
    INSERT INTO "StockReservation" (
      "id", "orderId", "orderItemId", "stockItemId", "quantity", "status", "createdAt"
    ) VALUES (
      'migration-reservation', 'migration-order', 'migration-order-item',
      'migration-stock', 2, 'ACTIVE', '${now}'
    );
  `);
}

describe("SQLite migration chain", () => {
  it("upgrades a populated legacy reservation through every migration", () => {
    const db = new Database(":memory:");
    const migrationRoot = join(process.cwd(), "prisma", "migrations");

    try {
      for (const directory of readdirSync(migrationRoot)
        .filter((entry) => /^\d/.test(entry))
        .sort()) {
        db.exec(readFileSync(join(migrationRoot, directory, "migration.sql"), "utf8"));
        if (directory === populatedCheckpoint) insertLegacyReservation(db);
      }

      expect(
        db
          .prepare(
            `SELECT "quantity", "status", "updatedAt", "releasedAt", "consumedAt"
             FROM "StockReservation" WHERE "id" = 'migration-reservation'`,
          )
          .get(),
      ).toMatchObject({
        quantity: 2,
        status: "ACTIVE",
        updatedAt: "2026-07-13T12:00:00.000Z",
        releasedAt: null,
        consumedAt: null,
      });
      expect(db.pragma("foreign_key_check")).toEqual([]);
      expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(() =>
        db
          .prepare(
            `UPDATE "StockItem" SET "quantity" = 1
             WHERE "id" = 'migration-stock'`,
          )
          .run(),
      ).toThrow("StockItem_reserved_within_quantity_check");
      expect(
        db.prepare(`SELECT "orderMode" FROM "Product" WHERE "id" = 'migration-product'`).get(),
      ).toEqual({ orderMode: "ORDER_ONLY" });
      db.prepare(`INSERT INTO "CustomerGroup" ("id", "code", "name", "updatedAt") VALUES ('migration-group', 'MIGRATION', 'Migration Group', CURRENT_TIMESTAMP)`).run();
      expect(() =>
        db.prepare(`INSERT INTO "PriceList" (
          "id", "name", "customerGroupId", "companyId", "updatedAt"
        ) VALUES (
          'invalid-scope', 'Invalid Scope', 'migration-group', 'migration-company', CURRENT_TIMESTAMP
        )`).run(),
      ).toThrow("PriceList_single_scope_check");
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM pragma_table_info('MediaAsset') WHERE "name" = 'objectKey'`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM pragma_table_info('Company') WHERE "name" = 'discountRate'`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM sqlite_master WHERE "type" = 'trigger' AND "name" IN ('Company_discountRate_insert_check', 'Company_discountRate_update_check')`).get()).toEqual({ count: 2 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM pragma_table_info('AuthLoginFailure')`).get()).toEqual({ count: 6 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM sqlite_master WHERE "type" = 'index' AND "name" IN (
        'AuthLoginFailure_emailKey_createdAt_idx',
        'AuthLoginFailure_ipKey_createdAt_idx',
        'AuthLoginFailure_expiresAt_idx'
      )`).get()).toEqual({ count: 3 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM pragma_table_info('SecurityRateLimitBucket')`).get()).toEqual({ count: 9 });
      expect(db.prepare(`SELECT COUNT(*) AS "count" FROM sqlite_master WHERE "type" = 'index' AND "name" IN (
        'SecurityRateLimitBucket_scope_keyType_keyHash_key',
        'SecurityRateLimitBucket_expiresAt_idx',
        'DealerApplicationDeduplication_applicationId_key',
        'DealerApplicationDeduplication_expiresAt_idx',
        'DealerApplication_email_createdAt_idx'
      )`).get()).toEqual({ count: 5 });
    } finally {
      db.close();
    }
  });
});
