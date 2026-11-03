import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import getMetrics from "./get-metrics.js";

export default defineAction({
  description:
    "Write Repro metrics to evidence/metrics.json in the app root (CLI: pnpm action export-metrics). Returns the file path and totals. Owner emails are not written.",
  schema: z.object({}),
  changeEvents: false,
  run: async (_args, ctx) => {
    const metrics = await getMetrics.run({}, ctx);
    const dir = path.resolve(process.cwd(), "evidence");
    const file = path.join(dir, "metrics.json");
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(file, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      fail(`Could not write ${file}: ${reason}`, { errorCode: "export_failed", statusCode: 500 });
    }
    return {
      path: file,
      totals: metrics.totals,
      message: `Wrote ${metrics.reports.length} report(s) to ${file}.`,
    };
  },
});
