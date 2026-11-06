/*
 * @file    bundles.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Smoke test of the built browser bundles (public/js/ts-*.bundle.js):
 *          each bundle is executed in a sandbox with DOM stubs and must start
 *          its animation and draw something on the canvas.
 *
 *          Skipped when the project has not been built (npm run build).
 */

//----- imports
import fs from "fs";
import path from "path";
import vm from "vm";
import { describe, test, expect } from "vitest";

import { FakeCanvas, FakeImage, FakeImageData } from "./harness/dom";

//----- globals
const JS_DIR = path.resolve(__dirname, "../public/js");
const bundles = fs.existsSync(JS_DIR)
    ? fs
          .readdirSync(JS_DIR)
          .filter((f) => /^ts-.*\.bundle\.js$/.test(f))
          .sort()
    : [];

//----- tests
describe.skipIf(bundles.length === 0)("built bundles start", () => {
    test.each(bundles)("%s", async (file) => {
        const canvas = new FakeCanvas(640, 480);
        const frames: FrameRequestCallback[] = [];
        const logs: string[] = [];

        const sandbox: Record<string, unknown> = {
            ImageData: FakeImageData,
            Image: FakeImage,
            Math,
            performance,
            setTimeout,
            console: { log: (m: unknown) => logs.push(String(m)) },
            requestAnimationFrame: (cb: FrameRequestCallback) => frames.push(cb),
            document: {
                getElementById: () => canvas,
                createElement: () => new FakeCanvas(),
            },
        };
        sandbox.window = sandbox;
        vm.createContext(sandbox);

        vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), "utf-8"), sandbox);

        // wait for the assets, then run a few frames
        for (let i = 0; i < 100 && !logs.some((l) => /Starting/i.test(l)); i++) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        for (let i = 0; i < 5; i++) {
            frames.shift()?.(1000 + i * 50);
        }

        expect(logs.some((l) => /Starting/i.test(l))).toBe(true);
        expect(canvas.getContext("2d").buffer.some((v) => v !== 0)).toBe(true);
    });
});
