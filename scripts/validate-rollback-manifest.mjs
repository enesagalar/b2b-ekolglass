import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const commitPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const backupPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

function isExactObject(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function validateRelease(value, label) {
  if (!isExactObject(value, ["releaseId", "commitSha", "artifactDigest"])) throw new Error(`${label} release shape is invalid.`);
  if (!releaseIdPattern.test(value.releaseId) || !commitPattern.test(value.commitSha) || !digestPattern.test(value.artifactDigest)) {
    throw new Error(`${label} release identity is invalid.`);
  }
}

export function validateRollbackManifest(value) {
  if (!isExactObject(value, ["schemaVersion", "reason", "approvedAt", "current", "previous", "migration"]) || value.schemaVersion !== 1) {
    throw new Error("Rollback manifest shape is invalid.");
  }
  if (typeof value.reason !== "string" || value.reason.trim().length < 10 || value.reason.length > 500) throw new Error("Rollback reason is invalid.");
  if (typeof value.approvedAt !== "string" || Number.isNaN(Date.parse(value.approvedAt))) throw new Error("Rollback approval timestamp is invalid.");
  validateRelease(value.current, "Current");
  validateRelease(value.previous, "Previous");
  if (value.current.artifactDigest === value.previous.artifactDigest || value.current.commitSha === value.previous.commitSha) {
    throw new Error("Previous release must differ from the current release.");
  }
  if (!isExactObject(value.migration, ["compatibility", "backupManifestId", "backupSha256"])) throw new Error("Migration rollback shape is invalid.");
  if (!["BACKWARD_COMPATIBLE", "RESTORE_REQUIRED"].includes(value.migration.compatibility)) throw new Error("Migration compatibility is invalid.");
  if (!backupPattern.test(value.migration.backupManifestId) || !/^[a-f0-9]{64}$/.test(value.migration.backupSha256)) throw new Error("Verified backup evidence is invalid.");
  return value;
}

export async function run(argumentsList = process.argv.slice(2), cwd = process.cwd()) {
  const argument = argumentsList.find((item) => item.startsWith("--manifest="));
  if (!argument) throw new Error("--manifest is required.");
  const manifestPath = path.resolve(cwd, argument.slice("--manifest=".length));
  const relative = path.relative(cwd, manifestPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Manifest path must stay inside the workspace.");
  return validateRollbackManifest(JSON.parse(await readFile(manifestPath, "utf8")));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then((manifest) => console.log(JSON.stringify({ status: "ready", previousReleaseId: manifest.previous.releaseId })))
    .catch((error) => {
      console.error(JSON.stringify({ status: "failed", error: error instanceof Error ? error.message : "Unknown error" }));
      process.exitCode = 1;
    });
}
