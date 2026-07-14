import { describe, expect, it } from "vitest";

import { matchesBearerSecret } from "./secret-policy";

describe("bearer secret policy", () => {
  it("matches only a strong exact bearer value", () => {
    const secret = "strong-runtime-secret-with-at-least-32-characters";

    expect(matchesBearerSecret(`Bearer ${secret}`, secret)).toBe(true);
    expect(matchesBearerSecret(`Bearer ${secret}x`, secret)).toBe(false);
    expect(matchesBearerSecret(null, secret)).toBe(false);
  });

  it("rejects published placeholders", () => {
    const placeholder = "replace-with-a-separate-long-random-secret";
    expect(matchesBearerSecret(`Bearer ${placeholder}`, placeholder)).toBe(false);
  });
});
