import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { runEmailOutboxOnce } = vi.hoisted(() => ({
  runEmailOutboxOnce: vi.fn(async () => []),
}));

vi.mock("@/integrations/email/worker", () => ({ runEmailOutboxOnce }));

import { POST } from "./route";

const secret = "route-test-outbox-secret-at-least-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.OUTBOX_CRON_SECRET;
  delete process.env.EMAIL_PROVIDER;
  runEmailOutboxOnce.mockClear();
});

describe("internal outbox route", () => {
  it("rejects requests without the worker bearer secret", async () => {
    process.env.OUTBOX_CRON_SECRET = secret;
    const response = await POST(
      new NextRequest("http://localhost/api/internal/outbox", { method: "POST" }),
    );
    expect(response.status).toBe(401);
    expect(runEmailOutboxOnce).not.toHaveBeenCalled();
  });

  it("fails closed when the configured secret is too short", async () => {
    process.env.OUTBOX_CRON_SECRET = "short";
    const response = await POST(
      new NextRequest("http://localhost/api/internal/outbox", {
        method: "POST",
        headers: { authorization: "Bearer short" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a published placeholder even when it is long enough", async () => {
    process.env.OUTBOX_CRON_SECRET = "replace-with-a-separate-long-random-secret";
    const response = await POST(
      new NextRequest("http://localhost/api/internal/outbox", {
        method: "POST",
        headers: {
          authorization: "Bearer replace-with-a-separate-long-random-secret",
        },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("reports a disabled production email worker as unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.OUTBOX_CRON_SECRET = secret;
    process.env.EMAIL_PROVIDER = "disabled";
    const response = await POST(
      new NextRequest("http://localhost/api/internal/outbox", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(response.status).toBe(503);
    expect(runEmailOutboxOnce).not.toHaveBeenCalled();
  });

  it("runs one email batch for an authorized request", async () => {
    process.env.OUTBOX_CRON_SECRET = secret;
    const response = await POST(
      new NextRequest("http://localhost/api/internal/outbox", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 0, results: [] });
    expect(runEmailOutboxOnce).toHaveBeenCalledOnce();
  });
});
