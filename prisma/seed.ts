import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const wholesale = await prisma.customerGroup.upsert({
    where: { code: "BAYI-STANDART" },
    update: {},
    create: {
      code: "BAYI-STANDART",
      name: "Standart Bayi",
      description: "Onaylı EkolGlass bayileri için başlangıç fiyat grubu.",
    },
  });

  const fleet = await prisma.customerGroup.upsert({
    where: { code: "FILO-KURUMSAL" },
    update: {},
    create: {
      code: "FILO-KURUMSAL",
      name: "Kurumsal Filo",
      description: "Düzenli filo ve servis müşterileri için özel fiyat grubu.",
    },
  });

  const categories = await Promise.all(
    [
      ["automotive-glass", "Otomotiv Camı", "Araç marka/model uyumlu değişim camları."],
      ["bus-minibus-glass", "Otobüs ve Minibüs Camı", "Büyük araç ve filo cam çözümleri."],
      ["caravan-glass", "Karavan Camı", "Karavan üreticileri ve servisleri için özel ürünler."],
      ["marine-glass", "Yat / Marine Camı", "Denizcilik ve özel ölçü cam talepleri."],
      ["custom-production", "Özel Üretim", "Ölçüye göre temperli veya lamine cam üretimi."],
    ].map(([slug, name, description], index) =>
      prisma.productCategory.upsert({
        where: { slug },
        update: { name, description, sortOrder: index + 1 },
        create: { slug, name, description, sortOrder: index + 1 },
      }),
    ),
  );

  const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

  const products = [
    {
      code: "EGL-OT-1458",
      name: "Fiat Ducato Ön Cam Lamine",
      categoryId: categoryBySlug["automotive-glass"].id,
      vehicleBrand: "Fiat",
      vehicleModel: "Ducato",
      yearStart: 2014,
      yearEnd: 2026,
      glassPosition: "Ön Cam",
      glassType: "Lamine",
      dimensions: "1680 x 980 mm",
      thicknessMm: "5.00",
      tint: "Yeşil",
      isLaminated: true,
      orderMode: "QUOTE_OR_ORDER",
      compatibilityNotes: "Peugeot Boxer ve Citroen Jumper eşdeğer kasalarla kontrol edilmelidir.",
    },
    {
      code: "EGL-BUS-2204",
      name: "Mercedes Sprinter Yan Sürgülü Cam",
      categoryId: categoryBySlug["bus-minibus-glass"].id,
      vehicleBrand: "Mercedes-Benz",
      vehicleModel: "Sprinter",
      yearStart: 2018,
      yearEnd: 2026,
      glassPosition: "Sağ Yan",
      glassType: "Temperli",
      dimensions: "1240 x 620 mm",
      thicknessMm: "4.00",
      tint: "Privacy",
      isTempered: true,
      orderMode: "QUOTE_OR_ORDER",
    },
    {
      code: "EGL-CAR-0901",
      name: "Karavan Açılır Yan Cam 900x450",
      categoryId: categoryBySlug["caravan-glass"].id,
      glassPosition: "Yan Cam",
      glassType: "Temperli",
      dimensions: "900 x 450 mm",
      thicknessMm: "4.00",
      tint: "Füme",
      isTempered: true,
      isCustomAvailable: true,
      orderMode: "QUOTE_ONLY",
    },
    {
      code: "EGL-MAR-0012",
      name: "Marine Lamine Kavisli Cam",
      categoryId: categoryBySlug["marine-glass"].id,
      glassType: "Lamine",
      dimensions: "Proje bazlı",
      thicknessMm: "8.00",
      isLaminated: true,
      isCustomAvailable: true,
      orderMode: "QUOTE_ONLY",
      processingNotes: "Şablon, ölçü çizimi ve teknik onay gerektirir.",
    },
  ];

  for (const product of products) {
    const savedProduct = await prisma.product.upsert({
      where: { code: product.code },
      update: product,
      create: product,
    });

    await prisma.stockItem.upsert({
      where: {
        productId_warehouseCode: {
          productId: savedProduct.id,
          warehouseCode: "MERKEZ",
        },
      },
      update: {
        quantity: product.orderMode === "QUOTE_ONLY" ? 0 : 18,
        status: product.orderMode === "QUOTE_ONLY" ? "MADE_TO_ORDER" : "IN_STOCK",
      },
      create: {
        productId: savedProduct.id,
        warehouseCode: "MERKEZ",
        quantity: product.orderMode === "QUOTE_ONLY" ? 0 : 18,
        status: product.orderMode === "QUOTE_ONLY" ? "MADE_TO_ORDER" : "IN_STOCK",
      },
    });
  }

  await prisma.company.upsert({
    where: { id: "seed-ekolglass-demo-dealer" },
    update: {},
    create: {
      id: "seed-ekolglass-demo-dealer",
      legalName: "Anadolu Oto Cam Sanayi ve Ticaret Ltd. Şti.",
      displayName: "Anadolu Oto Cam",
      email: "satinalma@anadoluotocam.example",
      phone: "+90 212 000 00 00",
      city: "İstanbul",
      taxOffice: "İkitelli",
      taxNumber: "1234567890",
      status: "APPROVED",
      customerGroupId: wholesale.id,
      paymentTerms: "30 gün vadeli",
    },
  });

  const standardPriceList = await prisma.priceList.upsert({
    where: { id: "seed-standard-price-list" },
    update: {},
    create: {
      id: "seed-standard-price-list",
      name: "Standart Bayi TRY",
      currency: "TRY",
      customerGroupId: wholesale.id,
    },
  });

  const fleetPriceList = await prisma.priceList.upsert({
    where: { id: "seed-fleet-price-list" },
    update: {},
    create: {
      id: "seed-fleet-price-list",
      name: "Kurumsal Filo EUR",
      currency: "EUR",
      customerGroupId: fleet.id,
    },
  });

  const seededProducts = await prisma.product.findMany({
    where: {
      code: {
        in: products.map((product) => product.code),
      },
    },
  });

  for (const [index, product] of seededProducts.entries()) {
    await prisma.productPrice.upsert({
      where: {
        productId_priceListId_minQuantity: {
          productId: product.id,
          priceListId: standardPriceList.id,
          minQuantity: 1,
        },
      },
      update: {
        amount: 4200 + index * 850,
      },
      create: {
        productId: product.id,
        priceListId: standardPriceList.id,
        amount: 4200 + index * 850,
        minQuantity: 1,
      },
    });

    await prisma.productPrice.upsert({
      where: {
        productId_priceListId_minQuantity: {
          productId: product.id,
          priceListId: fleetPriceList.id,
          minQuantity: 10,
        },
      },
      update: {
        amount: 128 + index * 24,
      },
      create: {
        productId: product.id,
        priceListId: fleetPriceList.id,
        amount: 128 + index * 24,
        minQuantity: 10,
      },
    });
  }

  await Promise.all([
    prisma.siteSetting.upsert({
      where: { key: "homepage.hero.title" },
      update: { value: "EkolGlass B2B Bayi Portalı" },
      create: {
        key: "homepage.hero.title",
        label: "Ana banner başlığı",
        value: "EkolGlass B2B Bayi Portalı",
        valueType: "TEXT",
        group: "homepage",
        description: "Public ana sayfadaki ana banner başlığı.",
      },
    }),
    prisma.siteSetting.upsert({
      where: { key: "homepage.hero.subtitle" },
      update: {
        value:
          "Otomotiv, karavan, otobüs-minibüs ve özel üretim cam siparişlerini tek merkezden yönetin.",
      },
      create: {
        key: "homepage.hero.subtitle",
        label: "Ana banner açıklaması",
        value:
          "Otomotiv, karavan, otobüs-minibüs ve özel üretim cam siparişlerini tek merkezden yönetin.",
        valueType: "TEXT",
        group: "homepage",
      },
    }),
    prisma.mediaAsset.upsert({
      where: { key: "homepage.hero.visual" },
      update: {},
      create: {
        key: "homepage.hero.visual",
        title: "EkolGlass üretim ve bayi operasyon görseli",
        url: "/hero-glass-workshop.svg",
        altText: "Endüstriyel otomotiv cam üretimi ve B2B sipariş operasyonu",
        usage: "HOMEPAGE_HERO",
      },
    }),
    prisma.siteSetting.upsert({
      where: { key: "homepage.hero.cta" },
      update: { value: "Bayi başvurusu yap" },
      create: {
        key: "homepage.hero.cta",
        label: "Birincil aksiyon metni",
        value: "Bayi başvurusu yap",
        valueType: "TEXT",
        group: "homepage",
      },
    }),
  ]);

  const homepage = await prisma.page.upsert({
    where: { slug: "home" },
    update: {
      title: "EkolGlass B2B Bayi Portalı",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seoTitle: "EkolGlass B2B Bayi Portalı",
      seoDescription: "EkolGlass bayi, teklif, sipariş ve katalog operasyon portalı.",
    },
    create: {
      slug: "home",
      title: "EkolGlass B2B Bayi Portalı",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seoTitle: "EkolGlass B2B Bayi Portalı",
      seoDescription: "EkolGlass bayi, teklif, sipariş ve katalog operasyon portalı.",
    },
  });

  await prisma.pageBlock.upsert({
    where: { id: "seed-home-b2b-value-block" },
    update: {
      title: "B2B operasyonu tek merkezde toplayın",
      body:
        "Bayi onayı, katalog, teklif, sipariş, stok ve sevkiyat iş akışları aynı veri modeli üzerinde ilerler.",
    },
    create: {
      id: "seed-home-b2b-value-block",
      pageId: homepage.id,
      type: "VALUE_PROPOSITION",
      sortOrder: 1,
      eyebrow: "Operasyonel temel",
      title: "B2B operasyonu tek merkezde toplayın",
      body:
        "Bayi onayı, katalog, teklif, sipariş, stok ve sevkiyat iş akışları aynı veri modeli üzerinde ilerler.",
      ctaLabel: "Kataloğu incele",
      ctaHref: "/katalog",
    },
  });

  await prisma.shippingProvider.upsert({
    where: { code: "CITY_LOJISTIK" },
    update: {
      name: "City Lojistik",
      providerType: "CITY_LOGISTICS_ADAPTER",
      isActive: false,
      notes:
        "Public API dokümanı doğrulanmadı. Canlı entegrasyon için City Lojistik müşteri API bilgileri ve test endpointleri gerekir.",
    },
    create: {
      code: "CITY_LOJISTIK",
      name: "City Lojistik",
      providerType: "CITY_LOGISTICS_ADAPTER",
      baseUrl: "https://citylojistik.com",
      isActive: false,
      supportsLabels: false,
      supportsWebhook: false,
      notes:
        "Public API dokümanı doğrulanmadı. Canlı entegrasyon için City Lojistik müşteri API bilgileri ve test endpointleri gerekir.",
    },
  });

  const widgets = [
    ["sales.pending_dealers", "Onay bekleyen bayi", "NEW_DEALER_APPLICATIONS", "SALES_MANAGER", "UsersRound", 1],
    ["sales.open_quotes", "Açık teklif talepleri", "OPEN_QUOTES", "SALES_MANAGER", "FileText", 2],
    ["ops.low_stock", "Düşük stok alarmı", "LOW_STOCK", "WAREHOUSE_STAFF", "Boxes", 1],
    ["ops.shipments_ready", "Sevke hazır sipariş", "READY_FOR_SHIPMENT", "WAREHOUSE_STAFF", "Truck", 2],
    ["finance.monthly_sales", "Aylık satış görünümü", "MONTHLY_SALES", "ACCOUNTING_STAFF", "BarChart3", 1],
  ] as const;

  for (const [key, title, metricKey, role, icon, sortOrder] of widgets) {
    await prisma.dashboardWidget.upsert({
      where: { key },
      update: { title, metricKey, role, icon, sortOrder },
      create: { key, title, metricKey, role, icon, sortOrder },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
