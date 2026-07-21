import { describe, expect, it } from "vitest";

import { getPublicReleaseMetadata } from "./release-metadata";

describe("public release metadata", () => {
  it("returns only complete immutable release identifiers", () => {
    expect(getPublicReleaseMetadata({
      APP_COMMIT_SHA: "A".repeat(40),
      APP_ARTIFACT_DIGEST: `sha256:${"B".repeat(64)}`,
      APP_RELEASE_ID: "production-2026.07.21-1",
    })).toEqual({
      commitSha: "a".repeat(40),
      artifactDigest: `sha256:${"b".repeat(64)}`,
      releaseId: "production-2026.07.21-1",
    });
  });

  it("fails closed for partial or malformed values", () => {
    expect(getPublicReleaseMetadata({ APP_COMMIT_SHA: "a".repeat(40) })).toBeNull();
    expect(getPublicReleaseMetadata({
      APP_COMMIT_SHA: "not-a-sha",
      APP_ARTIFACT_DIGEST: `sha256:${"b".repeat(64)}`,
      APP_RELEASE_ID: "release with spaces",
    })).toBeNull();
  });
});
