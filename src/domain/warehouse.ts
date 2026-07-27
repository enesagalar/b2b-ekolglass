import { z } from "zod";

const optionalWarehouseText = (max: number) =>
  z.preprocess(
    (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    },
    z.string().max(max).optional(),
  );

export function normalizeWarehouseCode(value: string) {
  return value.trim().toUpperCase();
}

export const warehouseFormSchema = z.object({
  id: optionalWarehouseText(120),
  expectedUpdatedAt: optionalWarehouseText(80),
  code: z
    .string()
    .trim()
    .min(2, "Depo kodu en az 2 karakter olmalıdır.")
    .max(40, "Depo kodu en fazla 40 karakter olabilir.")
    .transform(normalizeWarehouseCode)
    .refine(
      (value) => /^[A-Z0-9_-]+$/.test(value),
      "Depo kodu yalnızca A-Z, 0-9, _ ve - içerebilir.",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Depo adı en az 2 karakter olmalıdır.")
    .max(120, "Depo adı en fazla 120 karakter olabilir."),
  addressLine: optionalWarehouseText(240),
  district: optionalWarehouseText(100),
  city: optionalWarehouseText(100),
  postalCode: optionalWarehouseText(20),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Ülke kodu 2 karakter olmalıdır.")
    .default("TR"),
  isActive: z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.boolean(),
  ),
}).superRefine((data, context) => {
  if (
    data.id &&
    (!data.expectedUpdatedAt || Number.isNaN(Date.parse(data.expectedUpdatedAt)))
  ) {
    context.addIssue({
      code: "custom",
      path: ["expectedUpdatedAt"],
      message: "Depo kaydı sürümü geçersizdir.",
    });
  }
});

export type WarehouseFormInput = z.infer<typeof warehouseFormSchema>;
