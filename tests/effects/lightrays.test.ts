/*
 * @file    lightrays.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-lightrays building blocks (text mask)
 */

//----- imports
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

//----- globals
const MASK = path.resolve(__dirname, "../../files/effects/ts-lightrays/assets/mask.png");

//----- tests
describe("ts-lightrays mask", () => {
    test("mask: 640x480, letters present, the holes of O, a and e are open", () => {
        const png = PNG.sync.read(fs.readFileSync(MASK));
        expect(png.width).toBe(640);
        expect(png.height).toBe(480);

        const w = png.width;
        const h = png.height;
        const letter = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
            letter[i] = png.data[i * 4] > 127 ? 1 : 0;
        }
        const ink = letter.reduce((a, v) => a + v, 0) / (w * h);
        expect(ink).toBeGreaterThan(0.08);
        expect(ink).toBeLessThan(0.4);

        // label the black regions: the background touches the border, the holes don't
        const label = new Int32Array(w * h).fill(-1);
        const sizes: number[] = [];
        let borderLabels = new Set<number>();
        for (let start = 0; start < w * h; start++) {
            if (letter[start] || label[start] >= 0) continue;
            const id = sizes.length;
            let size = 0;
            let border = false;
            const stack = [start];
            label[start] = id;
            while (stack.length) {
                const i = stack.pop()!;
                size++;
                const x = i % w;
                const y = (i / w) | 0;
                if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
                for (const j of [i - 1, i + 1, i - w, i + w]) {
                    if (j < 0 || j >= w * h || letter[j] || label[j] >= 0) continue;
                    if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
                    label[j] = id;
                    stack.push(j);
                }
            }
            sizes.push(size);
            if (border) borderLabels = borderLabels.add(id);
        }
        const holes = sizes.filter((s, id) => !borderLabels.has(id) && s >= 30);
        expect(holes.length).toBeGreaterThanOrEqual(3);
    });
});
