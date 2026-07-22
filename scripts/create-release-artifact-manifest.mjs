import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const commitPattern = /^[a-f0-9]{40}$/i;
const digestPattern = /^sha256:[a-f0-9]{64}$/i;
const imageReferencePattern = /^[a-z0-9][a-z0-9._/-]*$/;

function requiredValue(value, label) {
  if (!value?.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function workspacePath(value, label, cwd) {
  const resolved = path.resolve(cwd, requiredValue(value, label));
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} must stay inside the workspace.`);
  return resolved;
}

export function parseArguments(argumentsList, cwd = process.cwd()) {
  const values = {};
  for (const argument of argumentsList) {
    const separator = argument.indexOf("=");
    if (!argument.startsWith("--") || separator < 3) throw new Error(`Unknown argument: ${argument}`);
    values[argument.slice(2, separator)] = argument.slice(separator + 1);
  }

  const metadataPath = workspacePath(values.metadata, "Build metadata path", cwd);
  const outputPath = workspacePath(values.output, "Output path", cwd);
  if (metadataPath === outputPath) throw new Error("Metadata and output paths must differ.");

  const commitSha = requiredValue(values["commit-sha"], "Commit SHA").toLowerCase();
  if (!commitPattern.test(commitSha) || /^0+$/.test(commitSha)) throw new Error("Commit SHA must contain 40 non-zero hexadecimal characters.");

  const imageReference = requiredValue(values["image-ref"], "Image reference");
  if (!imageReferencePattern.test(imageReference)) throw new Error("Image reference is invalid.");
  const platform = requiredValue(values.platform, "Platform");
  if (platform !== "linux/amd64") throw new Error("Platform must be linux/amd64.");

  return { metadataPath, outputPath, commitSha, imageReference, platform };
}

export async function createReleaseArtifactManifest(options, now = new Date()) {
  const metadata = JSON.parse(await readFile(options.metadataPath, "utf8"));
  const digest = metadata["containerimage.digest"] ?? metadata["containerimage.descriptor"]?.digest;
  if (typeof digest !== "string" || !digestPattern.test(digest)) throw new Error("Build metadata does not contain a valid registry digest.");
  const registryDigest = digest.toLowerCase();

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    source: { commitSha: options.commitSha, repository: "enesagalar/b2b-ekolglass" },
    artifact: {
      format: "oci-image",
      imageReference: options.imageReference,
      registryDigest,
      immutableReference: `${options.imageReference}@${registryDigest}`,
      platform: options.platform,
    },
    deploymentContract: {
      migrationBeforeTraffic: true,
      singleWriterSqlite: true,
      persistentVolume: "/data",
      runtimeDigestEnvironment: "APP_ARTIFACT_DIGEST",
    },
    rollbackContract: {
      application: "Deploy the previous verified OCI artifact by registry digest.",
      database: "Restore a verified pre-migration backup only when migrations are not backward compatible.",
      requiredEvidence: ["previousReleaseId", "previousCommitSha", "previousArtifactDigest", "backupManifest"],
    },
  };
}

export async function run(argumentsList = process.argv.slice(2), cwd = process.cwd()) {
  const options = parseArguments(argumentsList, cwd);
  const manifest = await createReleaseArtifactManifest(options);
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then((manifest) => console.log(JSON.stringify({ status: "ready", digest: manifest.artifact.registryDigest })))
    .catch((error) => {
      console.error(JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : "Unknown error" }));
      process.exitCode = 1;
    });
}
