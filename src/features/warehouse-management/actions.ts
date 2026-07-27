"use server";

import { Prisma } from "@/generated/prisma/client";
import { warehouseFormSchema } from "@/domain/warehouse";
import { requirePermissionUser } from "@/lib/auth";
import { revalidatePathsBestEffort } from "@/lib/cache-revalidation";
import { prisma } from "@/lib/prisma";

export type WarehouseActionState = {
  ok: boolean;
  message: string;
};

type WarehouseActionInput = FormData | WarehouseActionState;

const success = (message: string): WarehouseActionState => ({
  ok: true,
  message,
});
const failure = (message: string): WarehouseActionState => ({
  ok: false,
  message,
});

function resolveFormData(
  input: WarehouseActionInput,
  maybeFormData?: FormData,
) {
  return input instanceof FormData ? input : maybeFormData;
}

export async function saveWarehouse(
  input: WarehouseActionInput,
  maybeFormData?: FormData,
): Promise<WarehouseActionState> {
  const actor = await requirePermissionUser(
    "warehouse.manage",
    "/admin/stok/depolar",
  );
  const formData = resolveFormData(input, maybeFormData);
  if (!formData) return failure("Form verisi alınamadı.");

  const parsed = warehouseFormSchema.safeParse({
    id: formData.get("id") || undefined,
    expectedUpdatedAt: formData.get("expectedUpdatedAt") || undefined,
    code: formData.get("code"),
    name: formData.get("name"),
    addressLine: formData.get("addressLine") || undefined,
    district: formData.get("district") || undefined,
    city: formData.get("city") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    countryCode: formData.get("countryCode") || "TR",
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Depo bilgileri geçersiz.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!parsed.data.id) {
        const warehouse = await tx.warehouse.create({
          data: {
            code: parsed.data.code,
            name: parsed.data.name,
            isActive: parsed.data.isActive,
            addressLine: parsed.data.addressLine ?? null,
            district: parsed.data.district ?? null,
            city: parsed.data.city ?? null,
            postalCode: parsed.data.postalCode ?? null,
            countryCode: parsed.data.countryCode,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: "warehouse.created",
            entityType: "Warehouse",
            entityId: warehouse.id,
            metadata: JSON.stringify({
              code: warehouse.code,
              name: warehouse.name,
              isActive: warehouse.isActive,
            }),
          },
        });
        return { created: true, name: warehouse.name };
      }

      const current = await tx.warehouse.findUnique({
        where: { id: parsed.data.id },
      });
      if (!current) throw new Error("WAREHOUSE_NOT_FOUND");
      if (
        !parsed.data.expectedUpdatedAt ||
        current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt
      ) {
        throw new Error("WAREHOUSE_STALE");
      }
      if (current.code !== parsed.data.code) {
        throw new Error("WAREHOUSE_CODE_IMMUTABLE");
      }

      if (current.isActive && !parsed.data.isActive) {
        const [balance, activeWarehouseCount] = await Promise.all([
          tx.stockItem.aggregate({
            where: { warehouseCode: current.code },
            _sum: { quantity: true, reservedQuantity: true },
          }),
          tx.warehouse.count({ where: { isActive: true } }),
        ]);
        if (
          (balance._sum.quantity ?? 0) > 0 ||
          (balance._sum.reservedQuantity ?? 0) > 0
        ) {
          throw new Error("WAREHOUSE_HAS_STOCK");
        }
        if (activeWarehouseCount <= 1) {
          throw new Error("WAREHOUSE_LAST_ACTIVE");
        }
      }

      const warehouse = await tx.warehouse.update({
        where: { id: current.id },
        data: {
          name: parsed.data.name,
          isActive: parsed.data.isActive,
          addressLine: parsed.data.addressLine ?? null,
          district: parsed.data.district ?? null,
          city: parsed.data.city ?? null,
          postalCode: parsed.data.postalCode ?? null,
          countryCode: parsed.data.countryCode,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "warehouse.updated",
          entityType: "Warehouse",
          entityId: warehouse.id,
          metadata: JSON.stringify({
            code: warehouse.code,
            before: {
              name: current.name,
              isActive: current.isActive,
            },
            after: {
              name: warehouse.name,
              isActive: warehouse.isActive,
            },
          }),
        },
      });
      return { created: false, name: warehouse.name };
    });

    revalidatePathsBestEffort(
      ["/admin/stok", "/admin/stok/depolar", "/admin/urunler"],
      "warehouse.cache_revalidation_failed",
      { warehouseId: parsed.data.id ?? null },
    );
    return success(
      result.created
        ? `${result.name} oluşturuldu.`
        : `${result.name} güncellendi.`,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "WAREHOUSE_NOT_FOUND") {
        return failure("Depo kaydı bulunamadı.");
      }
      if (error.message === "WAREHOUSE_STALE") {
        return failure(
          "Depo kaydı başka bir işlem tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
        );
      }
      if (error.message === "WAREHOUSE_CODE_IMMUTABLE") {
        return failure(
          "Kullanılan depo kodu değiştirilemez. Depo adını veya adresini güncelleyebilirsiniz.",
        );
      }
      if (error.message === "WAREHOUSE_HAS_STOCK") {
        return failure(
          "Fiziksel veya rezerve stoğu bulunan depo pasife alınamaz. Önce stokları başka depoya aktarın.",
        );
      }
      if (error.message === "WAREHOUSE_LAST_ACTIVE") {
        return failure("Sistemde en az bir aktif depo bulunmalıdır.");
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure("Bu depo kodu zaten kullanılıyor.");
    }
    return failure("Depo kaydı sırasında beklenmeyen bir hata oluştu.");
  }
}
