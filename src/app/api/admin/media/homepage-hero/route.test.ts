import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogCreate: vi.fn(),
  deleteStoredImage: vi.fn(),
  getCurrentUser: vi.fn(),
  mediaAssetFindUnique: vi.fn(),
  mediaAssetUpdateMany: vi.fn(),
  revalidatePathsBestEffort: vi.fn(),
  storeImage: vi.fn(),
  structuredLog: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/cache-revalidation", () => ({ revalidatePathsBestEffort: mocks.revalidatePathsBestEffort }));
vi.mock("@/lib/media-storage", () => ({
  maxImageUploadBytes: 5 * 1024 * 1024,
  detectImageMime: (buffer: Buffer) => buffer[0] === 0x89 ? "image/png" : null,
  storeImage: mocks.storeImage,
  deleteStoredImage: mocks.deleteStoredImage,
}));
vi.mock("@/lib/observability", () => ({
  getCorrelationId: () => "11111111-1111-4111-8111-111111111111",
  correlationHeaders: (correlationId: string) => ({ "cache-control": "no-store", "x-request-id": correlationId }),
  structuredLog: mocks.structuredLog,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { POST } from "./route";

const currentUpdatedAt = new Date("2026-07-22T10:00:00.000Z");
const stored = {
  objectKey: "11111111-1111-4111-8111-111111111111-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
  mimeType: "image/png",
  checksum: "a".repeat(64),
  byteSize: 8,
  storageProvider: "LOCAL",
  url: "/media/new-banner.png",
};

function request(expectedUpdatedAt = currentUpdatedAt.toISOString(), bytes = [0x89, 0x50, 0x4e, 0x47]) {
  const formData = new FormData();
  formData.set("expectedUpdatedAt", expectedUpdatedAt);
  formData.set("altText", "EkolGlass ana sayfa banner gorseli");
  formData.set("file", new File([new Uint8Array(bytes)], "hero.png", { type: "image/png" }));
  return {
    url: "http://localhost:3000/api/admin/media/homepage-hero",
    headers: new Headers({ origin: "http://localhost:3000" }),
    formData: vi.fn(async () => formData),
  } as unknown as Request;
}

describe("homepage hero upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.storeImage.mockResolvedValue(stored);
    mocks.deleteStoredImage.mockResolvedValue(true);
    mocks.mediaAssetFindUnique.mockResolvedValue({
      id: "hero-1",
      key: "homepage.hero.visual",
      objectKey: "old.png",
      updatedAt: currentUpdatedAt,
    });
    mocks.mediaAssetUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditLogCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback) => callback({
      mediaAsset: {
        findUnique: mocks.mediaAssetFindUnique,
        updateMany: mocks.mediaAssetUpdateMany,
      },
      auditLog: { create: mocks.auditLogCreate },
    }));
  });

  it("commits the banner pointer and audit in one transaction", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, url: stored.url });
    expect(mocks.mediaAssetUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "hero-1", updatedAt: currentUpdatedAt }),
      data: expect.objectContaining({ objectKey: stored.objectKey }),
    }));
    expect(mocks.auditLogCreate).toHaveBeenCalledOnce();
    expect(mocks.deleteStoredImage).not.toHaveBeenCalled();
    expect(mocks.revalidatePathsBestEffort).toHaveBeenCalledOnce();
  });

  it("compensates the unique uploaded object when the form is stale", async () => {
    const response = await POST(request("2026-07-22T09:00:00.000Z"));

    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("Sayfayı yenileyin");
    expect(mocks.mediaAssetUpdateMany).not.toHaveBeenCalled();
    expect(mocks.deleteStoredImage).toHaveBeenCalledWith(stored.objectKey, "LOCAL");
    expect(mocks.revalidatePathsBestEffort).not.toHaveBeenCalled();
  });

  it("compensates storage and sanitizes an audit transaction failure", async () => {
    mocks.auditLogCreate.mockRejectedValue(new Error("secret sqlite audit failure"));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: "Görsel yüklenemedi.", correlationId: "11111111-1111-4111-8111-111111111111" });
    expect(JSON.stringify(body)).not.toContain("secret sqlite audit failure");
    expect(mocks.deleteStoredImage).toHaveBeenCalledWith(stored.objectKey, "LOCAL");
  });

  it("rejects unsupported content before writing to storage", async () => {
    const response = await POST(request(currentUpdatedAt.toISOString(), [0x3c, 0x73, 0x76, 0x67]));

    expect(response.status).toBe(415);
    expect(mocks.storeImage).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("fails closed on missing origin before session or storage access", async () => {
    const formData = new FormData();
    const response = await POST({
      url: "http://localhost:3000/api/admin/media/homepage-hero",
      headers: new Headers(),
      formData: vi.fn(async () => formData),
    } as unknown as Request);

    expect(response.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.storeImage).not.toHaveBeenCalled();
  });
});
