import { z } from "zod";

import {
  currencies,
  normalizeProductCode,
  parseOptionalDecimal,
  parseOptionalInt,
  productGlassTypes,
  productOrderModes,
  productStatuses,
  slugifyProductCategoryName,
  stockVisibilities,
} from "./catalog";
import {
  dealerApplicationStatuses,
  orderStatuses,
  quoteStatuses,
  stockStatuses,
} from "./statuses";

const optionalText = (max: number) =>
  z.preprocess((value) => {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : undefined;
  }, z.string().max(max).optional());

const optionalInt = z.preprocess(parseOptionalInt, z.number().int().optional());
const optionalDecimal = z.preprocess(
  parseOptionalDecimal,
  z.number().positive().optional(),
);
const checkboxBoolean = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

export const dealerApplicationSchema = z.object({
  companyName: z.string().min(2, "Firma adı zorunludur.").max(160),
  contactName: z.string().min(2, "Yetkili kişi zorunludur.").max(120),
  email: z.email("Geçerli bir e-posta girin."),
  phone: z.string().min(7, "Telefon numarası zorunludur.").max(40),
  city: z.string().min(2, "Şehir zorunludur.").max(80),
  taxNumber: z.string().max(30).optional(),
  customerType: z.string().min(2, "Müşteri tipi zorunludur.").max(80),
  message: z.string().max(1200).optional(),
});

export const dealerApplicationReviewSchema = z
  .object({
    id: z.string().trim().min(1, "Başvuru seçimi zorunludur."),
    expectedUpdatedAt: z
      .string()
      .trim()
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Başvuru sürümü geçersiz.",
      ),
    status: z.enum(dealerApplicationStatuses),
    internalNotes: optionalText(2000),
    customerGroupId: optionalText(120),
    paymentTerms: optionalText(200),
    creditLimit: z.preprocess(
      parseOptionalDecimal,
      z.number().nonnegative("Kredi limiti negatif olamaz.").optional(),
    ),
  })
  .superRefine((data, context) => {
    if (data.status === "APPROVED" && !data.customerGroupId) {
      context.addIssue({
        code: "custom",
        message: "Onaylanan bayi için müşteri grubu seçilmelidir.",
        path: ["customerGroupId"],
      });
    }
  });

export const companyDiscountSchema = z
  .object({
    companyId: z.string().trim().min(1, "Firma seçimi zorunludur."),
    discountRate: z.preprocess(
      parseOptionalDecimal,
      z
        .number()
        .min(0, "İskonto oranı negatif olamaz.")
        .max(100, "İskonto oranı yüzde 100'ü aşamaz."),
    ),
    paymentTerms: optionalText(240),
    creditPolicy: z.enum(["UNSET", "LIMITED", "UNLIMITED"]),
    creditLimit: z.preprocess(
      parseOptionalDecimal,
      z.number().nonnegative("Kredi limiti negatif olamaz.").optional(),
    ),
    changeReason: z.string().trim().min(10, "Değişiklik gerekçesi en az 10 karakter olmalıdır.").max(500),
  })
  .superRefine((value, context) => {
    if (value.creditPolicy === "LIMITED" && value.creditLimit === undefined) {
      context.addIssue({
        code: "custom",
        path: ["creditLimit"],
        message: "Limitli kredi politikası için tutar zorunludur.",
      });
    }
  });

export const productPublicationSchema = z.object({
  productId: z.string().trim().min(1, "Ürün seçimi zorunludur."),
  targetStatus: z.enum(["ACTIVE", "DRAFT"]),
});

export const productBulkPublicationSchema = z.object({
  productIds: z
    .array(z.string().trim().min(1, "Ürün seçimi geçersizdir."))
    .min(1, "Yayınlanacak en az bir ürün seçin.")
    .max(50, "Tek işlemde en fazla 50 ürün yayınlanabilir.")
    .transform((productIds) => [...new Set(productIds)]),
});

export const mediaAssetFormSchema = z.object({
  id: optionalText(120),
  productId: z.string().trim().min(1, "Urun secimi zorunludur."),
  key: optionalText(120),
  title: z.string().trim().min(2, "Medya basligi zorunludur.").max(160),
  url: z.url("Gecerli bir medya URL'i girin.").max(1000),
  altText: z.string().trim().min(2, "Alternatif metin zorunludur.").max(200),
  usage: z.string().trim().min(2, "Kullanim tipi zorunludur.").max(80),
  isActive: checkboxBoolean.default(false),
});

export const mediaAssetStatusFormSchema = z.object({
  id: z.string().trim().min(1, "Medya kaydi secimi zorunludur."),
  productId: z.string().trim().min(1, "Urun secimi zorunludur."),
  isActive: checkboxBoolean.default(false),
});

export const siteSettingSchema = z.object({
  key: z.string().min(3).max(120),
  value: z.string().min(1).max(2000),
});

export const homepageHeroMediaSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Banner görseli zorunludur.")
    .max(1000)
    .refine(
      (value) => value.startsWith("/") || z.url().safeParse(value).success,
      "Geçerli bir görsel yolu veya URL girin.",
    ),
  altText: z.string().trim().min(5, "Alternatif metin zorunludur.").max(200),
});

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır.").max(120),
});

export const activationInvitationSchema = z.object({
  userId: z.string().trim().min(1, "Kullanıcı seçimi zorunludur."),
});

export const dealerUserCreateSchema = z.object({
  companyId: z.string().trim().min(1, "Firma zorunludur."),
  name: z.string().trim().min(2, "Ad soyad zorunludur.").max(120),
  email: z
    .email("Geçerli bir e-posta girin.")
    .max(180)
    .transform((value) => value.toLowerCase()),
  role: z.enum(["DEALER_OWNER", "DEALER_STAFF"]),
});

export const dealerUserStatusSchema = z.object({
  companyId: z.string().trim().min(1, "Firma zorunludur."),
  userId: z.string().trim().min(1, "Kullanıcı zorunludur."),
  targetStatus: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
});

export const companyStatusSchema = z.object({
  companyId: z.string().trim().min(1, "Firma zorunludur."),
  expectedStatus: z.enum(["APPROVED", "SUSPENDED"]),
  expectedUpdatedAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Firma sürümü geçersiz."),
  targetStatus: z.enum(["APPROVED", "SUSPENDED"]),
  changeReason: z
    .string()
    .trim()
    .min(10, "Durum değişikliği gerekçesi en az 10 karakter olmalıdır.")
    .max(500, "Durum değişikliği gerekçesi en fazla 500 karakter olabilir."),
});

export const credentialResetInvitationSchema = z.object({
  userId: z.string().trim().min(1, "Kullanıcı seçimi zorunludur."),
});

export const accountActivationSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32, "Aktivasyon bağlantısı geçersiz.")
      .max(256),
    password: z
      .string()
      .min(12, "Parola en az 12 karakter olmalıdır.")
      .max(120)
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "Parola UTF-8 olarak en fazla 72 byte olabilir.",
      )
      .regex(/[a-z]/, "Parola en az bir küçük harf içermelidir.")
      .regex(/[A-Z]/, "Parola en az bir büyük harf içermelidir.")
      .regex(/[0-9]/, "Parola en az bir rakam içermelidir."),
    passwordConfirm: z.string(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.passwordConfirm) {
      context.addIssue({
        code: "custom",
        message: "Parola tekrarı eşleşmiyor.",
        path: ["passwordConfirm"],
      });
    }
  });

export const passwordResetSchema = accountActivationSchema;

export const categoryFormSchema = z
  .object({
    id: optionalText(120),
    name: z.string().trim().min(2, "Kategori adı zorunludur.").max(120),
    slug: optionalText(80),
    description: optionalText(500),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug
      ? slugifyProductCategoryName(data.slug)
      : slugifyProductCategoryName(data.name),
  }));

export const priceListFormSchema = z
  .object({
    id: optionalText(120),
    name: z.string().trim().min(2, "Fiyat listesi adı zorunludur.").max(140),
    currency: z.enum(currencies),
    scope: z.enum(["PUBLIC", "CUSTOMER_GROUP", "COMPANY"]),
    customerGroupId: optionalText(120),
    companyId: optionalText(120),
    startsAt: optionalText(40),
    endsAt: optionalText(40),
    priority: z.coerce.number().int().min(0).max(9999).default(0),
    isActive: checkboxBoolean.default(false),
  })
  .superRefine((data, context) => {
    if (data.scope === "CUSTOMER_GROUP" && !data.customerGroupId) {
      context.addIssue({ code: "custom", path: ["customerGroupId"], message: "Musteri grubu secilmelidir." });
    }
    if (data.scope === "COMPANY" && !data.companyId) {
      context.addIssue({ code: "custom", path: ["companyId"], message: "Firma secilmelidir." });
    }
    if (data.startsAt && Number.isNaN(Date.parse(data.startsAt))) {
      context.addIssue({ code: "custom", path: ["startsAt"], message: "Baslangic tarihi gecersiz." });
    }
    if (data.endsAt && Number.isNaN(Date.parse(data.endsAt))) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "Bitis tarihi gecersiz." });
    }
    if (data.startsAt && data.endsAt && Date.parse(data.endsAt) <= Date.parse(data.startsAt)) {
      context.addIssue({ code: "custom", path: ["endsAt"], message: "Bitis tarihi baslangictan sonra olmalidir." });
    }
  });

export const productFormSchema = z
  .object({
    id: optionalText(120),
    code: z
      .string()
      .trim()
      .min(3, "Ürün kodu zorunludur.")
      .max(64)
      .transform(normalizeProductCode),
    name: z.string().trim().min(2, "Ürün adı zorunludur.").max(160),
    categoryId: z.string().trim().min(1, "Kategori seçilmelidir."),
    vehicleBrand: optionalText(80),
    vehicleModel: optionalText(100),
    yearStart: optionalInt,
    yearEnd: optionalInt,
    glassPosition: optionalText(80),
    glassType: z.enum(productGlassTypes),
    dimensions: optionalText(80),
    thicknessMm: optionalDecimal,
    tint: optionalText(60),
    isTempered: checkboxBoolean.default(false),
    isLaminated: checkboxBoolean.default(false),
    processingNotes: optionalText(1000),
    compatibilityNotes: optionalText(1000),
    orderMode: z.enum(productOrderModes),
    status: z.enum(productStatuses),
  })
  .superRefine((data, context) => {
    if (
      data.yearStart !== undefined &&
      (data.yearStart < 1900 || data.yearStart > 2100)
    ) {
      context.addIssue({
        code: "custom",
        message: "Başlangıç yılı 1900-2100 arasında olmalıdır.",
        path: ["yearStart"],
      });
    }

    if (
      data.yearEnd !== undefined &&
      (data.yearEnd < 1900 || data.yearEnd > 2100)
    ) {
      context.addIssue({
        code: "custom",
        message: "Bitiş yılı 1900-2100 arasında olmalıdır.",
        path: ["yearEnd"],
      });
    }

    if (
      data.yearStart !== undefined &&
      data.yearEnd !== undefined &&
      data.yearEnd < data.yearStart
    ) {
      context.addIssue({
        code: "custom",
        message: "Bitiş yılı başlangıç yılından küçük olamaz.",
        path: ["yearEnd"],
      });
    }
  });

export const productCompatibilityFormSchema = z
  .object({
    id: optionalText(120),
    productId: z.string().trim().min(1, "Urun secimi zorunludur."),
    vehicleBrand: z.string().trim().min(2, "Marka zorunludur.").max(80),
    vehicleModel: z.string().trim().min(1, "Model zorunludur.").max(100),
    yearStart: optionalInt,
    yearEnd: optionalInt,
    oemReference: optionalText(120),
    notes: optionalText(1000),
  })
  .superRefine((data, context) => {
    if (
      data.yearStart !== undefined &&
      (data.yearStart < 1900 || data.yearStart > 2100)
    ) {
      context.addIssue({
        code: "custom",
        message: "Baslangic yili 1900-2100 arasinda olmalidir.",
        path: ["yearStart"],
      });
    }

    if (
      data.yearEnd !== undefined &&
      (data.yearEnd < 1900 || data.yearEnd > 2100)
    ) {
      context.addIssue({
        code: "custom",
        message: "Bitis yili 1900-2100 arasinda olmalidir.",
        path: ["yearEnd"],
      });
    }

    if (
      data.yearStart !== undefined &&
      data.yearEnd !== undefined &&
      data.yearEnd < data.yearStart
    ) {
      context.addIssue({
        code: "custom",
        message: "Bitis yili baslangic yilindan kucuk olamaz.",
        path: ["yearEnd"],
      });
    }
  });

export const productCompatibilityDeleteFormSchema = z.object({
  id: z.string().trim().min(1, "Uyumluluk kaydi secimi zorunludur."),
  productId: z.string().trim().min(1, "Urun secimi zorunludur."),
});

export const stockFormSchema = z
  .object({
    productId: optionalText(120),
    warehouseCode: z
      .string()
      .trim()
      .min(2, "Depo kodu zorunludur.")
      .max(40)
      .transform((value) => value.toUpperCase()),
    quantity: z.coerce.number().int().min(0, "Stok negatif olamaz."),
    reservedQuantity: z.coerce
      .number()
      .int()
      .min(0, "Rezerve stok negatif olamaz.")
      .default(0),
    visibility: z.enum(stockVisibilities),
    status: z.enum(stockStatuses),
  })
  .superRefine((data, context) => {
    if (data.reservedQuantity > data.quantity) {
      context.addIssue({
        code: "custom",
        message: "Rezerve stok toplam stoktan büyük olamaz.",
        path: ["reservedQuantity"],
      });
    }
  });

export const stockAdjustmentFormSchema = stockFormSchema.and(z.object({
  expectedUpdatedAt: optionalText(80),
  idempotencyKey: z.string().trim().min(16, "Stok işlem anahtarı geçersizdir.").max(160),
  reason: z.string().trim().min(10, "Stok düzeltme gerekçesi en az 10 karakter olmalıdır.").max(500),
}));

export const productPriceFormSchema = z.object({
  productId: optionalText(120),
  priceListId: z.string().trim().min(1, "Fiyat listesi seçilmelidir."),
  amount: z.preprocess(
    parseOptionalDecimal,
    z.number().positive("Fiyat pozitif olmalıdır."),
  ),
  minQuantity: z.coerce
    .number()
    .int()
    .min(1, "Minimum adet en az 1 olmalıdır.")
    .default(1),
});

export const quoteCartAddSchema = z.object({
  productId: z.string().trim().min(1, "Ürün seçimi zorunludur."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Adet en az 1 olmalıdır.")
    .max(999, "Adet en fazla 999 olabilir."),
  notes: optionalText(500),
});

export const quoteCartUpdateSchema = z.object({
  itemId: z.string().trim().min(1, "Sepet kalemi zorunludur."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Adet en az 1 olmalıdır.")
    .max(999, "Adet en fazla 999 olabilir."),
  notes: optionalText(500),
});

export const quoteCartRemoveSchema = z.object({
  itemId: z.string().trim().min(1, "Sepet kalemi zorunludur."),
});

export const quoteSubmitSchema = z.object({
  cartId: z.string().trim().min(1, "Teklif sepeti zorunludur."),
  cartVersion: z.coerce.number().int().positive("Sepet sürümü geçersiz."),
  requesterName: z.string().trim().min(2, "Yetkili adı zorunludur.").max(120),
  requesterEmail: z
    .string()
    .trim()
    .email("Geçerli bir e-posta girin.")
    .max(180),
  requesterPhone: optionalText(40),
  desiredDeliveryDate: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => value || undefined)
    .refine(
      (value) =>
        !value ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(`${value}T12:00:00.000Z`))),
      "İstenen teslim tarihi geçersiz.",
    ),
  notes: optionalText(1000),
  idempotencyKey: z.string().uuid("Gönderim anahtarı geçersiz."),
});

export const quoteStatusTransitionSchema = z
  .object({
    quoteId: z.string().trim().min(1, "Teklif seçimi zorunludur."),
    expectedStatus: z.enum(quoteStatuses),
    expectedVersion: z.coerce.number().int().positive("Teklif sürümü geçersiz."),
    targetStatus: z.enum(quoteStatuses),
    idempotencyKey: z.string().uuid("İşlem anahtarı geçersiz."),
    note: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (
      ["WAITING_FOR_CUSTOMER_INFO", "REJECTED", "CANCELLED"].includes(
        value.targetStatus,
      ) &&
      !value.note
    ) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Bu durum değişikliği için operasyon notu zorunludur.",
      });
    }
  });

export const quoteConversionSchema = z.object({
  quoteId: z.string().trim().min(1, "Teklif seçimi zorunludur."),
  expectedVersion: z.coerce.number().int().positive("Teklif sürümü geçersiz."),
  expectedOfferRevisionId: z.string().trim().min(1, "Aktif teklif revizyonu zorunludur."),
  deliveryAddressId: z.string().trim().min(1, "Teslimat adresi seçilmelidir."),
  shipmentMethod: z.enum([
    "CITY_LOJISTIK",
    "CUSTOMER_PICKUP",
    "SALES_COORDINATION",
  ]),
  notes: optionalText(1000),
  idempotencyKey: z.string().uuid("İşlem anahtarı geçersiz."),
});

export const quotePricingSchema = z.object({
  quoteId: z.string().trim().min(1, "Teklif seçimi zorunludur."),
  expectedStatus: z.enum(quoteStatuses),
  expectedVersion: z.coerce.number().int().positive("Teklif sürümü geçersiz."),
  idempotencyKey: z.string().uuid("İşlem anahtarı geçersiz."),
  currency: z.string().trim().regex(/^[A-Z]{3}$/, "Para birimi geçersiz."),
  internalNotes: optionalText(2000),
  items: z
    .array(
      z.object({
        itemId: z.string().trim().min(1, "Teklif kalemi zorunludur."),
        unitPrice: z
          .string()
          .trim()
          .regex(
            /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/,
            "Birim fiyat pozitif ve en fazla iki ondalık basamaklı olmalıdır.",
          )
          .refine((value) => Number(value) > 0, "Birim fiyat sıfırdan büyük olmalıdır."),
      }),
    )
    .min(1, "En az bir teklif kalemi fiyatlandırılmalıdır."),
});

export const orderCartAddSchema = z.object({
  productId: z.string().trim().min(1, "Ürün seçimi zorunludur."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Adet en az 1 olmalıdır.")
    .max(999, "Adet en fazla 999 olabilir."),
  notes: optionalText(500),
});

export const orderCartUpdateSchema = z.object({
  itemId: z.string().trim().min(1, "Sepet kalemi zorunludur."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Adet en az 1 olmalıdır.")
    .max(999, "Adet en fazla 999 olabilir."),
  notes: optionalText(500),
});

export const orderCartRemoveSchema = z.object({
  itemId: z.string().trim().min(1, "Sepet kalemi zorunludur."),
});

export const orderSubmitSchema = z.object({
  cartId: z.string().trim().min(1, "Sipariş sepeti zorunludur."),
  cartVersion: z.coerce.number().int().positive("Sepet sürümü geçersiz."),
  deliveryAddressId: z.string().trim().min(1, "Teslimat adresi seçilmelidir."),
  shipmentMethod: z.enum([
    "CITY_LOJISTIK",
    "CUSTOMER_PICKUP",
    "SALES_COORDINATION",
  ]),
  notes: optionalText(1000),
  idempotencyKey: z.string().uuid("Gönderim anahtarı geçersiz."),
});

export const orderStatusTransitionSchema = z
  .object({
    orderId: z.string().trim().min(1, "Sipariş seçimi zorunludur."),
    expectedStatus: z.enum(orderStatuses),
    expectedVersion: z.coerce
      .number()
      .int()
      .positive("Sipariş sürümü geçersiz."),
    targetStatus: z.enum(orderStatuses),
    idempotencyKey: z.string().uuid("İşlem anahtarı geçersiz."),
    note: optionalText(1000),
    carrier: optionalText(120),
    trackingNumber: optionalText(160),
    commercialOverrideReason: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (["CANCELLED", "ON_HOLD"].includes(value.targetStatus) && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "İptal ve bekletme işlemlerinde operasyon notu zorunludur.",
      });
    }
    if (
      value.commercialOverrideReason &&
      value.commercialOverrideReason.length < 10
    ) {
      context.addIssue({
        code: "custom",
        path: ["commercialOverrideReason"],
        message: "Ticari istisna gerekçesi en az 10 karakter olmalıdır.",
      });
    }
  });

export const dealerAddressCreateSchema = z.object({
  label: z.string().trim().min(2, "Adres etiketi zorunludur.").max(80),
  line1: z.string().trim().min(5, "Açık adres zorunludur.").max(240),
  line2: optionalText(160),
  district: optionalText(100),
  city: z.string().trim().min(2, "Şehir zorunludur.").max(100),
  postalCode: optionalText(20),
  isDefault: checkboxBoolean.default(false),
});
