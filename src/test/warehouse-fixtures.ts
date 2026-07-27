import { prisma } from "@/lib/prisma";

export async function createTestWarehouses(codes: string[]) {
  await prisma.warehouse.createMany({
    data: codes.map((code) => ({
      id: `test-warehouse:${code}`,
      code,
      name: `Test ${code}`,
      isActive: true,
    })),
  });
}

export async function deleteTestWarehouses(codes: string[]) {
  await prisma.warehouse.deleteMany({
    where: { code: { in: codes } },
  });
}
