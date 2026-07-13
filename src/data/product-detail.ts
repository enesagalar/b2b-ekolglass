import "server-only";

import { buildCatalogPriceWhere } from "@/data/catalog-access";
import type { CatalogViewer } from "@/domain/catalog";
import { prisma } from "@/lib/prisma";

export async function getProductDetail(productId: string, viewer: CatalogViewer) {
  return prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    select: {
      id: true,
      code: true,
      name: true,
      vehicleBrand: true,
      vehicleModel: true,
      yearStart: true,
      yearEnd: true,
      glassPosition: true,
      glassType: true,
      dimensions: true,
      thicknessMm: true,
      tint: true,
      isTempered: true,
      isLaminated: true,
      isCustomAvailable: true,
      orderMode: true,
      category: { select: { id: true, name: true } },
      compatibilities: {
        orderBy: [{ vehicleBrand: "asc" }, { vehicleModel: "asc" }],
        select: {
          id: true,
          vehicleBrand: true,
          vehicleModel: true,
          yearStart: true,
          yearEnd: true,
          oemReference: true,
          notes: true,
        },
      },
      mediaAssets: {
        where: { isActive: true },
        orderBy: [{ usage: "asc" }, { title: "asc" }],
        select: { id: true, title: true, url: true, altText: true, usage: true },
      },
      stockItems: {
        select: { quantity: true, reservedQuantity: true, status: true, visibility: true },
      },
      prices: {
        where: buildCatalogPriceWhere(viewer),
        orderBy: { minQuantity: "asc" },
        select: {
          id: true,
          productId: true,
          amount: true,
          minQuantity: true,
          priceList: {
            select: {
              id: true,
              name: true,
              currency: true,
              companyId: true,
              customerGroupId: true,
              startsAt: true,
              endsAt: true,
              isActive: true,
              priority: true,
            },
          },
        },
      },
    },
  });
}

export type ProductDetailData = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;
