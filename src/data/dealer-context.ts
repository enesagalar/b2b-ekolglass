import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { isAdminRole, isDealerRole, isKnownRole } from "@/domain/roles";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const requireDealerContext = cache(async (nextPath = "/bayi") => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isKnownRole(user.role) || !isDealerRole(user.role)) {
    if (isKnownRole(user.role) && isAdminRole(user.role)) {
      redirect("/admin");
    }

    redirect("/giris?error=dealer-role");
  }

  if (!user.companyId) {
    redirect("/giris?error=dealer-company");
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      id: true,
      legalName: true,
      displayName: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      status: true,
      paymentTerms: true,
      creditPolicy: true,
      creditLimit: true,
      discountRate: true,
      customerGroup: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!company || company.status !== "APPROVED") {
    redirect("/giris?error=dealer-company");
  }

  return { user, company };
});
