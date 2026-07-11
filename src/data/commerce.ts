import "server-only";

import { isDealerRole, isKnownRole } from "@/domain/roles";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCommerceIdentity() {
  const user = await getCurrentUser();
  if (!user || !isKnownRole(user.role) || !isDealerRole(user.role) || !user.companyId) return null;

  const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { displayName: true, status: true } });
  if (!company || company.status !== "APPROVED") return null;

  return { name: user.name, companyId: user.companyId, companyName: company.displayName, isDealer: true as const };
}
