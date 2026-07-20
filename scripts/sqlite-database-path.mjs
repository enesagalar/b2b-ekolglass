import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveTestDatabasePath(
  databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db",
  baseDirectory = process.cwd(),
) {
  if (typeof databaseUrl !== "string" || !databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use the file: protocol");
  }

  if (databaseUrl.includes("?") || databaseUrl.includes("#")) {
    throw new Error("DATABASE_URL must not include a query string or fragment");
  }

  const encodedPath = databaseUrl.slice("file:".length);
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(encodedPath);
  } catch {
    throw new Error("DATABASE_URL contains invalid percent encoding");
  }

  if (
    decodedPath.length === 0 ||
    decodedPath.includes("\0") ||
    decodedPath.includes("?") ||
    decodedPath.includes("#") ||
    decodedPath.toLowerCase() === ":memory:"
  ) {
    throw new Error("DATABASE_URL must reference a file-backed SQLite database");
  }

  if (encodedPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(decodedPath)) {
    try {
      return fileURLToPath(databaseUrl);
    } catch {
      throw new Error("DATABASE_URL contains an invalid file URL");
    }
  }

  return path.resolve(baseDirectory, decodedPath);
}
