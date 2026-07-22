import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseArguments, run } from "./create-release-artifact-manifest.mjs";

const imageReference = "ghcr.io/enesagalar/b2b-ekolglass";

test("rejects unsafe paths and malformed release identity", () => {
  const cwd = path.join(os.tmpdir(), "release-manifest-workspace");
  assert.throws(
    () => parseArguments(["--metadata=../metadata.json", "--output=manifest.json", `--commit-sha=${"a".repeat(40)}`, `--image-ref=${imageReference}`, "--platform=linux/amd64"], cwd),
    /inside the workspace/,
  );
  assert.throws(
    () => parseArguments(["--metadata=metadata.json", "--output=manifest.json", "--commit-sha=main", `--image-ref=${imageReference}`, "--platform=linux/amd64"], cwd),
    /40 non-zero hexadecimal/,
  );
});

test("creates a release manifest from the registry digest returned by buildx", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "ekolglass-release-"));
  try {
    const registryDigest = `sha256:${"d".repeat(64)}`;
    await writeFile(path.join(cwd, "metadata.json"), JSON.stringify({ "containerimage.digest": registryDigest }));
    const manifest = await run([
      "--metadata=metadata.json",
      "--output=release-manifest.json",
      `--commit-sha=${"b".repeat(40)}`,
      `--image-ref=${imageReference}`,
      "--platform=linux/amd64",
    ], cwd);
    const persisted = JSON.parse(await readFile(path.join(cwd, "release-manifest.json"), "utf8"));

    assert.equal(persisted.artifact.registryDigest, registryDigest);
    assert.equal(manifest.artifact.immutableReference, `${imageReference}@${registryDigest}`);
    assert.equal(manifest.deploymentContract.migrationBeforeTraffic, true);
    assert.equal(manifest.rollbackContract.requiredEvidence.length, 4);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("rejects metadata without a registry digest", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "ekolglass-release-"));
  try {
    await writeFile(path.join(cwd, "metadata.json"), JSON.stringify({ "containerimage.digest": "sha256:not-real" }));
    await assert.rejects(
      run(["--metadata=metadata.json", "--output=release-manifest.json", `--commit-sha=${"c".repeat(40)}`, `--image-ref=${imageReference}`, "--platform=linux/amd64"], cwd),
      /valid registry digest/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("refuses to overwrite release evidence", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "ekolglass-release-"));
  try {
    await writeFile(path.join(cwd, "metadata.json"), JSON.stringify({ "containerimage.digest": `sha256:${"e".repeat(64)}` }));
    await writeFile(path.join(cwd, "release-manifest.json"), "existing-evidence");
    await assert.rejects(
      run(["--metadata=metadata.json", "--output=release-manifest.json", `--commit-sha=${"f".repeat(40)}`, `--image-ref=${imageReference}`, "--platform=linux/amd64"], cwd),
      /EEXIST/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
