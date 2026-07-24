import { Workbook } from "exceljs";

import { requirePermissionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function GET(request: Request) {
  await requirePermissionUser(
    "price.read",
    "/admin/urunler/fiyat-listeleri",
  );
  const priceListId = new URL(request.url).searchParams.get("priceListId");
  if (!priceListId) {
    return Response.json(
      { error: "Fiyat listesi seçilmelidir." },
      { status: 400 },
    );
  }

  const priceList = await prisma.priceList.findUnique({
    where: { id: priceListId },
    include: {
      prices: {
        select: {
          productId: true,
          amount: true,
          minQuantity: true,
        },
      },
    },
  });
  if (!priceList) {
    return Response.json({ error: "Fiyat listesi bulunamadı." }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { status: { in: ["ACTIVE", "DRAFT"] } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });
  const pricesByProduct = new Map<string, typeof priceList.prices>();
  for (const price of priceList.prices) {
    const current = pricesByProduct.get(price.productId) ?? [];
    current.push(price);
    pricesByProduct.set(price.productId, current);
  }

  const workbook = new Workbook();
  workbook.creator = "EkolGlass B2B";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Fiyatlar", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "urun_kodu", key: "productCode", width: 18 },
    { header: "urun_adi", key: "productName", width: 58 },
    { header: "liste_fiyati", key: "netPrice", width: 16 },
    { header: "minimum_adet", key: "minQuantity", width: 16 },
  ];
  sheet.autoFilter = "A1:D1";
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF00639A" },
  };
  sheet.getColumn(3).numFmt = '#,##0.00';
  sheet.getColumn(4).numFmt = '0';

  for (const product of products) {
    const prices = pricesByProduct.get(product.id);
    if (prices?.length) {
      for (const price of prices.sort(
        (left, right) => left.minQuantity - right.minQuantity,
      )) {
        sheet.addRow({
          productCode: product.code,
          productName: product.name,
          netPrice: Number(price.amount),
          minQuantity: price.minQuantity,
        });
      }
    } else {
      sheet.addRow({
        productCode: product.code,
        productName: product.name,
        netPrice: "",
        minQuantity: 1,
      });
    }
  }

  const instructions = workbook.addWorksheet("Açıklama");
  instructions.columns = [
    { key: "title", width: 28 },
    { key: "description", width: 90 },
  ];
  [
    ["Fiyat listesi", `${priceList.name} (${priceList.currency})`],
    ["urun_kodu", "Değiştirmeyin; katalogdaki ürün kodudur."],
    ["urun_adi", "Bilgi amaçlıdır; aktarımda değiştirilmez."],
    ["liste_fiyati", "İskonto öncesi, KDV hariç, 0'dan büyük ve en fazla iki ondalıklı fiyat."],
    ["minimum_adet", "Fiyat kademesinin başladığı adet; standart fiyat için 1."],
    [
      "İşleyiş",
      "Dosya önce önizlenir. Hatalı satırlar düzeltilmeden canlı fiyatlar değişmez.",
    ],
  ].forEach(([title, description]) =>
    instructions.addRow({ title, description }),
  );
  instructions.getColumn(1).font = { bold: true };

  const output = await workbook.xlsx.writeBuffer();
  const fileName = `ekolglass-${safeFileName(priceList.name) || "fiyat-listesi"}.xlsx`;
  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
