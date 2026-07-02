import { z } from "zod";

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

export const siteSettingSchema = z.object({
  key: z.string().min(3).max(120),
  value: z.string().min(1).max(2000),
});

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır.").max(120),
});
