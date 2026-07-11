import "server-only";

import { canViewCatalogPrices, type CatalogViewer } from "@/domain/catalog";
import { isAdminRole } from "@/domain/roles";
import { Prisma } from "@/generated/prisma/client";

export function buildCatalogPriceWhere(viewer: CatalogViewer, now = new Date()): Prisma.ProductPriceWhereInput {
  if (!canViewCatalogPrices(viewer)) {
    return { id: { in: [] } };
  }

  const priceListWhere: Prisma.PriceListWhereInput = {
    isActive: true,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
  };

  if (!isAdminRole(viewer.role)) {
    priceListWhere.AND = [
      {
        OR: [
          ...(viewer.companyId ? [{ companyId: viewer.companyId }] : []),
          ...(viewer.customerGroupId ? [{ customerGroupId: viewer.customerGroupId }] : []),
          { companyId: null, customerGroupId: null },
        ],
      },
    ];
  }

  return {
    priceList: {
      is: priceListWhere,
    },
  };
}
