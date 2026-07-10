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
import { dealerApplicationStatuses, stockStatuses } from "./statuses";

const optionalText = (max: number) =>
  z.preprocess((value) => {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : undefined;
  }, z.string().max(max).optional());

const optionalInt = z.preprocess(parseOptionalInt, z.number().int().optional());
const optionalDecimal = z.preprocess(parseOptionalDecimal, z.number().positive().optional());
const checkboxBoolean = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

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
    expectedUpdatedAt: z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Başvuru sürümü geçersiz."),
    status: z.enum(dealerApplicationStatuses),
    internalNotes: optionalText(2000),
    customerGroupId: optionalText(120),
    paymentTerms: optionalText(200),
    creditLimit: z.preprocess(parseOptionalDecimal, z.number().nonnegative("Kredi limiti negatif olamaz.").optional()),
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

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır.").max(120),
});

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
    slug: data.slug ? slugifyProductCategoryName(data.slug) : slugifyProductCategoryName(data.name),
  }));

export const priceListFormSchema = z.object({
  id: optionalText(120),
  name: z.string().trim().min(2, "Fiyat listesi adı zorunludur.").max(140),
  currency: z.enum(currencies),
  isActive: checkboxBoolean.default(false),
});

export const productFormSchema = z
  .object({
    id: optionalText(120),
    code: z.string().trim().min(3, "Ürün kodu zorunludur.").max(64).transform(normalizeProductCode),
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
    isCustomAvailable: checkboxBoolean.default(false),
    processingNotes: optionalText(1000),
    compatibilityNotes: optionalText(1000),
    orderMode: z.enum(productOrderModes),
    status: z.enum(productStatuses),
  })
  .superRefine((data, context) => {
    if (data.yearStart !== undefined && (data.yearStart < 1900 || data.yearStart > 2100)) {
      context.addIssue({ code: "custom", message: "Başlangıç yılı 1900-2100 arasında olmalıdır.", path: ["yearStart"] });
    }

    if (data.yearEnd !== undefined && (data.yearEnd < 1900 || data.yearEnd > 2100)) {
      context.addIssue({ code: "custom", message: "Bitiş yılı 1900-2100 arasında olmalıdır.", path: ["yearEnd"] });
    }

    if (data.yearStart !== undefined && data.yearEnd !== undefined && data.yearEnd < data.yearStart) {
      context.addIssue({ code: "custom", message: "Bitiş yılı başlangıç yılından küçük olamaz.", path: ["yearEnd"] });
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
    if (data.yearStart !== undefined && (data.yearStart < 1900 || data.yearStart > 2100)) {
      context.addIssue({ code: "custom", message: "Baslangic yili 1900-2100 arasinda olmalidir.", path: ["yearStart"] });
    }

    if (data.yearEnd !== undefined && (data.yearEnd < 1900 || data.yearEnd > 2100)) {
      context.addIssue({ code: "custom", message: "Bitis yili 1900-2100 arasinda olmalidir.", path: ["yearEnd"] });
    }

    if (data.yearStart !== undefined && data.yearEnd !== undefined && data.yearEnd < data.yearStart) {
      context.addIssue({ code: "custom", message: "Bitis yili baslangic yilindan kucuk olamaz.", path: ["yearEnd"] });
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
    reservedQuantity: z.coerce.number().int().min(0, "Rezerve stok negatif olamaz.").default(0),
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

export const productPriceFormSchema = z.object({
  productId: optionalText(120),
  priceListId: z.string().trim().min(1, "Fiyat listesi seçilmelidir."),
  amount: z.preprocess(parseOptionalDecimal, z.number().positive("Fiyat pozitif olmalıdır.")),
  minQuantity: z.coerce.number().int().min(1, "Minimum adet en az 1 olmalıdır.").default(1),
});
