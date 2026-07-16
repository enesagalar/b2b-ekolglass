import { loadEnvConfig } from "@next/env";

import { validateProductionEnvironment } from "../src/lib/production-environment";

loadEnvConfig(process.cwd(), false);

const result = validateProductionEnvironment();

if (!result.ok) {
  console.error(JSON.stringify({ status: "failed", issues: result.issues }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "ready", checks: ["environment"] }));
}
