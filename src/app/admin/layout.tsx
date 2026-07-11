import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/features/admin/admin-shell";
import { requireAdminUser } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();

  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}
