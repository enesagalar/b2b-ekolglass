import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { parseEkolProductCsv } from "../src/domain/product-import";

const csvPath = process.argv[2];
if (!csvPath) throw new Error("Kullanim: npm run catalog:import -- <csv-dosyasi>");

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
if (!databaseUrl.startsWith("file:")) throw new Error("Bu import komutu SQLite file datasource gerektirir.");
const databasePath = path.resolve(process.cwd(), databaseUrl.slice("file:".length));
const buffer = readFileSync(path.resolve(csvPath));
const parsed = parseEkolProductCsv(buffer);
const db = new Database(databasePath);

const importCatalog = db.transaction(() => {
  const categoryIds = new Map<string, string>();
  const upsertCategory = db.prepare(`
    INSERT INTO ProductCategory (id, slug, name, description, sortOrder, createdAt, updatedAt)
    VALUES (?, ?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET name=excluded.name, sortOrder=excluded.sortOrder, updatedAt=CURRENT_TIMESTAMP
  `);
  for (const category of parsed.categories) {
    const existing = db.prepare("SELECT id FROM ProductCategory WHERE slug = ?").get(category.slug) as { id: string } | undefined;
    const id = existing?.id ?? randomUUID();
    upsertCategory.run(id, category.slug, category.name, category.sortOrder);
    categoryIds.set(category.slug, id);
  }

  const existingCodes = new Set(
    (db.prepare(`SELECT code FROM Product WHERE code IN (${parsed.products.map(() => "?").join(",")})`).all(...parsed.products.map((item) => item.code)) as Array<{ code: string }>).map((item) => item.code),
  );
  const upsertProduct = db.prepare(`
    INSERT INTO Product (
      id, code, name, categoryId, vehicleBrand, vehicleModel, yearStart, yearEnd,
      glassPosition, glassType, dimensions, thicknessMm, tint, isTempered, isLaminated,
      processingNotes, compatibilityNotes, isCustomAvailable, orderMode, status, createdAt, updatedAt
    ) VALUES (
      @id, @code, @name, @categoryId, @vehicleBrand, @vehicleModel, @yearStart, @yearEnd,
      @glassPosition, @glassType, @dimensions, @thicknessMm, @tint, @isTempered, @isLaminated,
      @processingNotes, @compatibilityNotes, 0, 'ORDER_ONLY', 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) ON CONFLICT(code) DO UPDATE SET
      name=excluded.name, categoryId=excluded.categoryId, vehicleBrand=excluded.vehicleBrand,
      vehicleModel=excluded.vehicleModel, yearStart=excluded.yearStart, yearEnd=excluded.yearEnd,
      glassPosition=excluded.glassPosition, glassType=excluded.glassType, dimensions=excluded.dimensions,
      thicknessMm=excluded.thicknessMm, tint=excluded.tint, isTempered=excluded.isTempered,
      isLaminated=excluded.isLaminated, processingNotes=excluded.processingNotes,
      compatibilityNotes=excluded.compatibilityNotes, updatedAt=CURRENT_TIMESTAMP
  `);
  const insertStock = db.prepare(`
    INSERT OR IGNORE INTO StockItem (id, productId, warehouseCode, quantity, reservedQuantity, visibility, status, updatedAt)
    VALUES (?, ?, 'MERKEZ', 0, 0, 'SIMPLIFIED', 'ASK_FOR_AVAILABILITY', CURRENT_TIMESTAMP)
  `);
  for (const product of parsed.products) {
    const current = db.prepare("SELECT id FROM Product WHERE code = ?").get(product.code) as { id: string } | undefined;
    const id = current?.id ?? randomUUID();
    upsertProduct.run({
      ...product,
      id,
      categoryId: categoryIds.get(product.categorySlug),
      isTempered: product.isTempered ? 1 : 0,
      isLaminated: product.isLaminated ? 1 : 0,
    });
    insertStock.run(randomUUID(), id);
  }

  const actor = db.prepare("SELECT id FROM User WHERE role = 'SUPER_ADMIN' ORDER BY createdAt LIMIT 1").get() as { id: string } | undefined;
  if (actor) {
    db.prepare(`INSERT INTO AuditLog (id, actorUserId, action, entityType, metadata, createdAt)
      VALUES (?, ?, 'product.csv.import', 'Product', ?, CURRENT_TIMESTAMP)`).run(
      randomUUID(),
      actor.id,
      JSON.stringify({
        fileName: path.basename(csvPath),
        sha256: createHash("sha256").update(buffer).digest("hex"),
        created: parsed.products.filter((item) => !existingCodes.has(item.code)).length,
        updated: parsed.products.filter((item) => existingCodes.has(item.code)).length,
        skipped: parsed.skippedRows,
      }),
    );
  }
  return {
    total: parsed.products.length,
    created: parsed.products.filter((item) => !existingCodes.has(item.code)).length,
    updated: parsed.products.filter((item) => existingCodes.has(item.code)).length,
    skipped: parsed.skippedRows,
  };
});

try {
  console.log(JSON.stringify(importCatalog(), null, 2));
} finally {
  db.close();
}
