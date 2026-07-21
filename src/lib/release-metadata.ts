type ReleaseEnvironment = Record<string, string | undefined>;

const commitPattern = /^[a-f0-9]{40}$/i;
const digestPattern = /^sha256:[a-f0-9]{64}$/i;
const releaseIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export function getPublicReleaseMetadata(env: ReleaseEnvironment = process.env) {
  const commitSha = env.APP_COMMIT_SHA?.trim();
  const artifactDigest = env.APP_ARTIFACT_DIGEST?.trim();
  const releaseId = env.APP_RELEASE_ID?.trim();
  if (!commitSha || !artifactDigest || !releaseId) return null;
  if (!commitPattern.test(commitSha) || !digestPattern.test(artifactDigest) || !releaseIdPattern.test(releaseId)) return null;
  return {
    commitSha: commitSha.toLowerCase(),
    artifactDigest: artifactDigest.toLowerCase(),
    releaseId,
  };
}
