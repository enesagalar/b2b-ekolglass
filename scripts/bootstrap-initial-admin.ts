import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import { z } from "zod";

import { PrismaClient } from "../src/generated/prisma/client";

const bootstrapSchema = z.object({
  databaseUrl: z.string().trim().startsWith("file:"),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(120),
  password: z
    .string()
    .min(12)
    .max(120)
    .refine((value) => new TextEncoder().encode(value).length <= 72)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

async function main() {
  const parsed = bootstrapSchema.safeParse({
    databaseUrl: process.env.DATABASE_URL,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    name: process.env.BOOTSTRAP_ADMIN_NAME ?? "EkolGlass Super Admin",
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    throw new Error(
      "DATABASE_URL ve gecerli BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_PASSWORD degerleri zorunludur.",
    );
  }

  const adapter = new PrismaBetterSqlite3({ url: parsed.data.databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const existingUserCount = await tx.user.count();
      if (existingUserCount !== 0) {
        throw new Error(
          "Bootstrap reddedildi: ilk yonetici yalniz tamamen bos User tablosunda olusturulabilir.",
        );
      }

      const created = await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          passwordHash,
        },
        select: { id: true, role: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: created.id,
          action: "system.initial_admin.bootstrap",
          entityType: "User",
          entityId: created.id,
          metadata: JSON.stringify({ schemaVersion: 1 }),
        },
      });

      return created;
    });

    console.log(JSON.stringify({ ok: true, user }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "Ilk yonetici olusturulamadi.",
    }),
  );
  process.exitCode = 1;
});
