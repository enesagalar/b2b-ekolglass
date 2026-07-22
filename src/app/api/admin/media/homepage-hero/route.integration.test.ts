import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteStoredImage: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePathsBestEffort: vi.fn(),
  storeImage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/cache-revalidation", () => ({ revalidatePathsBestEffort: mocks.revalidatePathsBestEffort }));
vi.mock("@/lib/media-storage", () => ({
  maxImageUploadBytes: 5 * 1024 * 1024,
  detectImageMime: () => "image/png",
  storeImage: mocks.storeImage,
  deleteStoredImage: mocks.deleteStoredImage,
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const actorId = `hero-integrity-${suffix}`;
const triggerName = `hero_audit_failure_${Date.now()}`;
const key = "homepage.hero.visual";
let original: Awaited<ReturnType<typeof prisma.mediaAsset.findUniqueOrThrow>>;

function uploadRequest(expectedUpdatedAt: Date) {
  const formData = new FormData();
  formData.set("expectedUpdatedAt", expectedUpdatedAt.toISOString());
  formData.set("altText", "EkolGlass rollback banner gorseli");
  formData.set("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "hero.png", { type: "image/png" }));
  return {
    url: "http://localhost:3000/api/admin/media/homepage-hero",
    headers: new Headers({ origin: "http://localhost:3000" }),
    formData: vi.fn(async () => formData),
  } as unknown as Request;
}

describe("homepage hero persistence integrity with SQLite", () => {
  beforeAll(async () => {
    original = await prisma.mediaAsset.findUniqueOrThrow({ where: { key } });
    await prisma.user.create({
      data: { id: actorId, email: `${actorId}@example.com`, name: "Hero Integrity", role: "ADMIN", status: "ACTIVE" },
    });
    mocks.getCurrentUser.mockResolvedValue({ id: actorId, role: "ADMIN" });
    mocks.storeImage.mockResolvedValue({
      objectKey: `11111111-1111-4111-8111-111111111111-${"c".repeat(64)}.png`,
      mimeType: "image/png",
      checksum: "c".repeat(64),
      byteSize: 4,
      storageProvider: "LOCAL",
      url: "/media/rollback-banner.png",
    });
    mocks.deleteStoredImage.mockResolvedValue(true);
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}"`);
    await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
    await prisma.mediaAsset.update({
      where: { key },
      data: {
        title: original.title,
        url: original.url,
        altText: original.altText,
        usage: original.usage,
        productId: original.productId,
        isActive: original.isActive,
        objectKey: original.objectKey,
        mimeType: original.mimeType,
        byteSize: original.byteSize,
        checksum: original.checksum,
        storageProvider: original.storageProvider,
        uploadedByUserId: original.uploadedByUserId,
      },
    });
    await prisma.user.deleteMany({ where: { id: actorId } });
  });

  it("rolls the banner pointer back and compensates storage when audit persistence fails", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW."action" = 'homepage.hero.media.upload'
      BEGIN SELECT RAISE(ABORT, 'secret hero audit failure'); END
    `);

    const response = await POST(uploadRequest(original.updatedAt));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Görsel yüklenemedi.");
    expect(JSON.stringify(body)).not.toContain("secret hero audit failure");
    const persisted = await prisma.mediaAsset.findUniqueOrThrow({ where: { key } });
    expect(persisted.objectKey).toBe(original.objectKey);
    expect(persisted.altText).toBe(original.altText);
    expect(await prisma.auditLog.count({ where: { actorUserId: actorId } })).toBe(0);
    expect(mocks.deleteStoredImage).toHaveBeenCalledOnce();
  });
});
