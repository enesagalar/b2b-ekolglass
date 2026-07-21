import "server-only";

import { revalidatePath } from "next/cache";

import { structuredLog } from "@/lib/observability";

export function revalidatePathsBestEffort(
  paths: string[],
  event: string,
  context: Record<string, unknown> = {},
) {
  for (const path of [...new Set(paths)]) {
    try {
      revalidatePath(path);
    } catch (error) {
      structuredLog("warn", event, { ...context, path, error });
    }
  }
}
