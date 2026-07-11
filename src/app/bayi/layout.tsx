import type { ReactNode } from "react";

import { requireDealerContext } from "@/data/dealer-context";
import { DealerShell } from "@/features/dealer/dealer-shell";

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
