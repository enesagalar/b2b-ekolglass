import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireDealerContext } from "@/data/dealer-context";
import { DealerShell } from "@/features/dealer/dealer-shell";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function DealerLayout({ children }: { children: ReactNode }) {
  const { user, company } = await requireDealerContext();

  return (
    <DealerShell
      user={{ name: user.name, role: user.role }}
      company={{ displayName: company.displayName, customerGroupName: company.customerGroup?.name ?? null }}
    >
      {children}
    </DealerShell>
  );
}
