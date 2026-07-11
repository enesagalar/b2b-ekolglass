import "server-only";

import { buildCatalogPriceWhere } from "@/data/catalog-access";
import type { CatalogViewer } from "@/domain/catalog";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductSearchParams = Record<string, string | string[] | undefined>;

function valueOf(params: ProductSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function getProductBrowserData(params: ProductSearchParams, viewer: CatalogViewer) {
  const query = valueOf(params, "q")?.trim() ?? "";
  const categoryId = valueOf(params, "categoryId") ?? "";
  const glassType = valueOf(params, "glassType") ?? "";
  const stockStatus = valueOf(params, "stockStatus") ?? "";
  const page = Math.max(1, Number(valueOf(params, "page")) || 1);
  const pageSize = 24;
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (query) {
    where.OR = [
      { code: { contains: query } }, { name: { contains: query } }, { vehicleBrand: { contains: query } },
      { vehicleModel: { contains: query } }, { dimensions: { contains: query } }, { compatibilityNotes: { contains: query } },
      { compatibilities: { some: { OR: [{ vehicleBrand: { contains: query } }, { vehicleModel: { contains: query } }, { oemReference: { contains: query } }, { notes: { contains: query } }] } } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (glassType) where.glassType = glassType;
  if (stockStatus) where.stockItems = { some: { status: stockStatus } };

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, code: true, name: true, vehicleBrand: true, vehicleModel: true, yearStart: true, yearEnd: true,
        dimensions: true, glassType: true, tint: true, orderMode: true, category: { select: { id: true, name: true } },
        stockItems: { select: { quantity: true, reservedQuantity: true, status: true, visibility: true } },
        prices: { where: buildCatalogPriceWhere(viewer), orderBy: { minQuantity: "asc" }, select: { amount: true, minQuantity: true, priceList: { select: { name: true, currency: true, companyId: true, customerGroupId: true, startsAt: true, endsAt: true, isActive: true } } } },
      },
    }),
    prisma.product.count({ where }),
    prisma.productCategory.findMany({ where: { products: { some: { status: "ACTIVE" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  return { products, total, categories, query, categoryId, glassType, stockStatus, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
