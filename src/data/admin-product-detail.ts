import { prisma } from "@/lib/prisma";

export const adminProductDetailTabKeys = [
  "genel",
  "stok",
  "fiyat",
  "uyumluluk",
  "medya",
  "audit",
] as const;

export type AdminProductDetailTab = (typeof adminProductDetailTabKeys)[number];

export function resolveAdminProductDetailTab(value: string | undefined): AdminProductDetailTab {
  return adminProductDetailTabKeys.includes(value as AdminProductDetailTab)
    ? (value as AdminProductDetailTab)
    : "genel";
}

export async function getAdminProductDetailData({
  id,
  activeTab,
  canReadPrice,
  canReadStock,
  canManageStock,
}: {
  id: string;
  activeTab: AdminProductDetailTab;
  canReadPrice: boolean;
  canReadStock: boolean;
  canManageStock: boolean;
}) {
  const [
    product,
    publicationPrices,
    publicationStockItems,
    stockItems,
    prices,
    compatibilities,
    mediaAssets,
    priceLists,
    activeWarehouses,
  ] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: true },
    }),
    canReadPrice && activeTab !== "fiyat"
      ? prisma.productPrice.findMany({
          where: { productId: id },
          select: {
            id: true,
            amount: true,
            minQuantity: true,
            priceList: {
              select: {
                companyId: true,
                customerGroupId: true,
                isActive: true,
                startsAt: true,
                endsAt: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    activeTab !== "stok"
      ? prisma.stockItem.findMany({
          where: { productId: id },
          select: { quantity: true, reservedQuantity: true },
        })
      : Promise.resolve([]),
    activeTab === "stok" && canReadStock
      ? prisma.stockItem.findMany({
          where: { productId: id },
          orderBy: { warehouseCode: "asc" },
        })
      : Promise.resolve([]),
    activeTab === "fiyat" && canReadPrice
      ? prisma.productPrice.findMany({
          where: { productId: id },
          include: { priceList: true },
          orderBy: [{ priceList: { name: "asc" } }, { minQuantity: "asc" }],
        })
      : Promise.resolve([]),
    activeTab === "uyumluluk"
      ? prisma.productCompatibility.findMany({
          where: { productId: id },
          orderBy: [{ vehicleBrand: "asc" }, { vehicleModel: "asc" }],
        })
      : Promise.resolve([]),
    activeTab === "medya"
      ? prisma.mediaAsset.findMany({
          where: { productId: id },
          orderBy: [{ isActive: "desc" }, { title: "asc" }],
        })
      : Promise.resolve([]),
    activeTab === "fiyat" && canReadPrice
      ? prisma.priceList.findMany({
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    activeTab === "stok" && canManageStock
      ? prisma.warehouse.findMany({
          where: { isActive: true },
          orderBy: [{ name: "asc" }, { code: "asc" }],
          select: { code: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  if (!product) return null;

  const auditLogs =
    activeTab === "audit"
      ? await prisma.auditLog.findMany({
          where: {
            OR: [
              { entityType: "Product", entityId: product.id },
              ...(publicationPrices.length > 0
                ? [
                    {
                      entityType: "ProductPrice",
                      entityId: { in: publicationPrices.map((price) => price.id) },
                    },
                  ]
                : []),
            ],
          },
          include: { actor: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : [];

  return {
    product,
    publicationPrices: activeTab === "fiyat" ? prices : publicationPrices,
    publicationStockItems: activeTab === "stok" ? stockItems : publicationStockItems,
    stockItems,
    prices,
    compatibilities,
    mediaAssets,
    priceLists,
    activeWarehouses,
    auditLogs,
  };
}
