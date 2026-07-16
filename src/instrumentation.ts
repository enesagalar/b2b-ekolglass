import type { Instrumentation } from "next";

import { getCorrelationId, structuredLog } from "@/lib/observability";

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  structuredLog("error", "next.request.unhandled_error", {
    correlationId: getCorrelationId(),
    method: request.method,
    path: request.path.split("?", 1)[0],
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    error,
  });
};
