/*
 * @file    effects.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Frame-hash regression tests: each effect must render exactly the
 *          same pixels as the golden reference (tests/golden/<effect>.json).
 *
 *          Update the references (only when a visual change is intended):
 *              npx vitest run -u
 */

//----- imports
import { describe, test, expect } from "vitest";
import { runEffect } from "./harness/runner";

import { EFFECTS } from "./effects";

//----- tests
describe("effects render identical frames", () => {
    test.each(Object.entries(EFFECTS))("%s", async (name, Effect) => {
        const result = await runEffect(Effect);
        await expect(JSON.stringify(result, null, 4) + "\n").toMatchFileSnapshot(`golden/${name}.json`);
    });
});
