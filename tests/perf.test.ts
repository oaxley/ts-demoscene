/*
 * @file    perf.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rough per-frame timing of every effect (not a regression test)
 *
 *          Run with: BENCH=1 npx vitest run tests/perf.test.ts --silent=false
 */

//----- imports
import { describe, test } from "vitest";
import { runEffect } from "./harness/runner";
import { EFFECTS } from "./effects";

//----- tests
describe.skipIf(!process.env.BENCH)("effects timing", () => {
    test("ms per frame", async () => {
        const rows: string[] = [];
        for (const [name, Effect] of Object.entries(EFFECTS)) {
            await runEffect(Effect, 10, 1000); // warm-up
            const times: number[] = [];
            await runEffect(Effect, 100, 1000, (ms) => times.push(ms));
            times.sort((a, b) => a - b);
            const ms = times[times.length >> 1]; // median
            rows.push(`${name.padEnd(14)} ${ms.toFixed(2).padStart(7)} ms/frame`);
        }
        console.log("\n" + rows.join("\n"));
    });
});
