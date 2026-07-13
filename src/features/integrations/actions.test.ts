import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermissionUser: vi.fn(),
  replayOutboxEvent: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requirePermissionUser: mocks.requirePermissionUser }));
vi.mock("@/data/admin-integrations", async () => {
  const actual = await vi.importActual<typeof import("@/data/admin-integrations")>(
    "@/data/admin-integrations",
  );
  return { ...actual, replayOutboxEvent: mocks.replayOutboxEvent };
});

import { replayOutboxEventAction } from "./actions";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("eventId", "event-1");
  data.set("requestId", "11111111-1111-4111-8111-111111111111");
  data.set("expectedStatus", "DEAD");
  data.set("expectedAttempts", "8");
  data.set("expectedUpdatedAt", "2026-07-13T20:00:00.000Z");
  data.set("reason", "SMTP ayarları düzeltildi.");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("outbox replay action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionUser.mockResolvedValue({ id: "admin-1" });
    mocks.replayOutboxEvent.mockResolvedValue({ id: "event-1", status: "PENDING" });
  });

  it("validates before authorization", async () => {
    const result = await replayOutboxEventAction(
      { ok: false, message: "" },
      form({ requestId: "bad" }),
    );
    expect(result.ok).toBe(false);
    expect(mocks.requirePermissionUser).not.toHaveBeenCalled();
  });

  it("requires replay permission and passes CAS inputs", async () => {
    const result = await replayOutboxEventAction(
      { ok: false, message: "" },
      form(),
    );
    expect(result.ok).toBe(true);
    expect(mocks.requirePermissionUser).toHaveBeenCalledWith(
      "integration.replay",
      "/admin/entegrasyonlar",
    );
    expect(mocks.replayOutboxEvent).toHaveBeenCalledWith(
      "admin-1",
      expect.objectContaining({
        eventId: "event-1",
        expectedStatus: "DEAD",
        expectedAttempts: 8,
      }),
    );
  });

  it("requires a reason for dead-letter replay", async () => {
    const result = await replayOutboxEventAction(
      { ok: false, message: "" },
      form({ reason: "short" }),
    );
    expect(result.ok).toBe(false);
    expect(mocks.replayOutboxEvent).not.toHaveBeenCalled();
  });
});
