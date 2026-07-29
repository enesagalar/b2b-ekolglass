import writeXlsxFile, { type SheetData } from "write-excel-file/node";

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

  const headerCell = (value: string) => ({
    value,
    type: String,
    fontWeight: "bold" as const,
    textColor: "#FFFFFF",
    backgroundColor: "#00639A",
  });
  const priceRows: SheetData = [
    [
      headerCell("urun_kodu"),
      headerCell("urun_adi"),
      headerCell("liste_fiyati"),
      headerCell("minimum_adet"),
    ],
  ];

  for (const product of products) {
    const prices = pricesByProduct.get(product.id);
    if (prices?.length) {
      for (const price of prices.sort(
        (left, right) => left.minQuantity - right.minQuantity,
      )) {
        priceRows.push([
          product.code,
          product.name,
          {
            value: Number(price.amount),
            type: Number,
            format: "#,##0.00",
          },
          { value: price.minQuantity, type: Number, format: "0" },
        ]);
      }
    } else {
      priceRows.push([
        product.code,
        product.name,
        "",
        { value: 1, type: Number, format: "0" },
      ]);
    }
  }

  const instructions: SheetData = [
    ["Fiyat listesi", `${priceList.name} (${priceList.currency})`],
    ["urun_kodu", "Değiştirmeyin; katalogdaki ürün kodudur."],
    ["urun_adi", "Bilgi amaçlıdır; aktarımda değiştirilmez."],
    ["liste_fiyati", "İskonto öncesi, KDV hariç, 0'dan büyük ve en fazla iki ondalıklı fiyat."],
    ["minimum_adet", "Fiyat kademesinin başladığı adet; standart fiyat için 1."],
    [
      "İşleyiş",
      "Dosya önce önizlenir. Hatalı satırlar düzeltilmeden canlı fiyatlar değişmez.",
    ],
  ].map(([title, description]) => [
    { value: title, type: String, fontWeight: "bold" },
    description,
  ]);

  const output = await writeXlsxFile(
    [
      {
        data: priceRows,
        sheet: "Fiyatlar",
        columns: [{ width: 18 }, { width: 58 }, { width: 16 }, { width: 16 }],
        stickyRowsCount: 1,
      },
      {
        data: instructions,
        sheet: "Açıklama",
        columns: [{ width: 28 }, { width: 90 }],
      },
    ],
    { fontFamily: "Arial", fontSize: 10 },
  ).toBuffer();
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
