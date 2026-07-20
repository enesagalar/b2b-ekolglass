import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSqliteBackup: vi.fn(),
  verifySqliteBackup: vi.fn(async () => ({ ok: true })),
  uploadVerifiedBackup: vi.fn(async () => ({ status: "uploaded", provider: "S3" })),
  beginSystemJobRun: vi.fn(async () => ({ replayed: false, run: { leaseToken: "backup-lease" } })),
  heartbeatSystemJobRun: vi.fn(async () => ({ updated: true })),
  finishSystemJobRun: vi.fn(async () => ({ updated: true })),
}));

vi.mock("@/lib/sqlite-backup", () => ({
  createSqliteBackup: mocks.createSqliteBackup,
  verifySqliteBackup: mocks.verifySqliteBackup,
  resolveSqliteDatabasePath: vi.fn(() => "C:\\data\\portal.db"),
}));
vi.mock("@/lib/offsite-backup", () => ({
  uploadVerifiedBackup: mocks.uploadVerifiedBackup,
}));
vi.mock("@/lib/system-jobs", () => ({
  beginSystemJobRun: mocks.beginSystemJobRun,
  heartbeatSystemJobRun: mocks.heartbeatSystemJobRun,
  finishSystemJobRun: mocks.finishSystemJobRun,
  SystemJobBusyError: class extends Error {},
}));

import { POST } from "./route";

const secret = "backup-route-secret-at-least-32-characters";

afterEach(() => {
  delete process.env.BACKUP_CRON_SECRET;
  mocks.createSqliteBackup.mockReset();
  mocks.verifySqliteBackup.mockClear();
  mocks.uploadVerifiedBackup.mockClear();
  mocks.beginSystemJobRun.mockClear();
  mocks.heartbeatSystemJobRun.mockClear();
  mocks.finishSystemJobRun.mockClear();
});

describe("internal database backup route", () => {
  it("rejects missing and weak bearer secrets", async () => {
    process.env.BACKUP_CRON_SECRET = "short";
    const response = await POST(new NextRequest("http://localhost/api/internal/backup", {
      method: "POST",
      headers: { authorization: "Bearer short" },
    }));
    expect(response.status).toBe(401);
    expect(mocks.createSqliteBackup).not.toHaveBeenCalled();
  });

  it("publishes only after lease checkpoints and restore verification", async () => {
    process.env.BACKUP_CRON_SECRET = secret;
    mocks.createSqliteBackup.mockImplementation(async (options) => {
      await options.checkpoint();
      return {
        databasePath: "C:\\backups\\bundle\\backup.sqlite",
        manifestPath: "C:\\backups\\bundle\\backup.manifest.json",
        manifest: { byteSize: 4096, sha256: "a".repeat(64), createdAt: "2026-07-16T12:00:00.000Z" },
      };
    });

    const response = await POST(new NextRequest("http://localhost/api/internal/backup", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));
    const requestId = response.headers.get("x-request-id");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      backup: {
        databaseFile: "backup.sqlite",
        manifestFile: "backup.manifest.json",
        byteSize: 4096,
        offsite: { status: "uploaded", provider: "S3" },
      },
      correlationId: requestId,
    });
    expect(mocks.heartbeatSystemJobRun).toHaveBeenCalledTimes(3);
    expect(mocks.verifySqliteBackup).toHaveBeenCalledOnce();
    expect(mocks.uploadVerifiedBackup).toHaveBeenCalledWith({
      databasePath: "C:\\backups\\bundle\\backup.sqlite",
      manifestPath: "C:\\backups\\bundle\\backup.manifest.json",
    });
    expect(mocks.finishSystemJobRun).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCEEDED", resultCount: 1 }));
  });

  it("records a controlled failure when restore verification fails", async () => {
    process.env.BACKUP_CRON_SECRET = secret;
    mocks.createSqliteBackup.mockResolvedValue({
      databasePath: "C:\\backups\\bundle\\backup.sqlite",
      manifestPath: "C:\\backups\\bundle\\backup.manifest.json",
      manifest: { byteSize: 4096, sha256: "a".repeat(64), createdAt: "2026-07-16T12:00:00.000Z" },
    });
    mocks.verifySqliteBackup.mockRejectedValueOnce(new Error("restore failed"));

    const response = await POST(new NextRequest("http://localhost/api/internal/backup", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "Database backup tamamlanamadı.", correlationId: expect.any(String) });
    expect(mocks.finishSystemJobRun).toHaveBeenCalledWith(expect.objectContaining({ status: "FAILED", errorCode: "DATABASE_BACKUP_FAILED" }));
  });

  it("does not mark the job successful when offsite transfer fails", async () => {
    process.env.BACKUP_CRON_SECRET = secret;
    mocks.createSqliteBackup.mockResolvedValue({
      databasePath: "C:\\backups\\bundle\\backup.sqlite",
      manifestPath: "C:\\backups\\bundle\\backup.manifest.json",
      manifest: { byteSize: 4096, sha256: "a".repeat(64), createdAt: "2026-07-16T12:00:00.000Z" },
    });
    mocks.uploadVerifiedBackup.mockRejectedValueOnce(new Error("offsite unavailable"));

    const response = await POST(new NextRequest("http://localhost/api/internal/backup", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }));

    expect(response.status).toBe(500);
    expect(mocks.finishSystemJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FAILED", errorCode: "DATABASE_BACKUP_FAILED" }),
    );
  });
});
