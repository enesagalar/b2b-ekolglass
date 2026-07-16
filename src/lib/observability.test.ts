import { afterEach, describe, expect, it, vi } from "vitest";

import { getCorrelationId, structuredLog } from "./observability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("observability", () => {
  it("always creates a server-owned request id", () => {
    expect(getCorrelationId()).toMatch(uuidPatternForTest);
    expect(getCorrelationId()).not.toBe("11111111-1111-4111-8111-111111111111");
  });

  it("emits one-line JSON and redacts sensitive fields and bearer values", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    structuredLog("error", "worker.failed", {
      correlationId: "11111111-1111-4111-8111-111111111111",
      authorization: "Bearer should-not-leak",
      nested: { apiKey: "private-key" },
      error: new Error("Request user@example.com failed with Basic hidden-value"),
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    const output = String(errorSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({ level: "error", event: "worker.failed" });
    expect(output).not.toContain("should-not-leak");
    expect(output).not.toContain("private-key");
    expect(output).not.toContain("hidden-value");
    expect(output).not.toContain("user@example.com");
  });
});

const uuidPatternForTest = /^[0-9a-f-]{36}$/i;
