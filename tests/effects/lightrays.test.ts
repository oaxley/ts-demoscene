/*
 * @file    lightrays.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-lightrays building blocks (text mask, light path, rays)
 */

//----- imports
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

import { lightPath, occlusion, radialBlur, downsample, FPS } from "../../files/effects/ts-lightrays/src/lightrays";

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

describe("ts-lightrays rays", () => {
    test("lightPath sweeps across the whole screen and back, deterministically", () => {
        let minX = Infinity;
        let maxX = -Infinity;
        for (let f = 0; f < 20 * FPS; f++) {
            const p = lightPath(f, 640, 480);
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            expect(Math.abs(p.y - 240)).toBeLessThanOrEqual(120);
        }
        expect(minX).toBeLessThan(0);
        expect(maxX).toBeGreaterThan(640);
        expect(lightPath(123, 640, 480)).toEqual(lightPath(123, 640, 480));
    });

    test("occlusion: zero on the letters, brightest at the light", () => {
        const w = 32;
        const h = 32;
        const mask = new Uint8Array(w * h);
        mask[16 * w + 20] = 1;
        const out = new Uint8Array(w * h);
        occlusion(mask, w, h, 10, 16, out);
        expect(out[16 * w + 20]).toBe(0);
        expect(out[16 * w + 10]).toBe(Math.max(...out));
        expect(out[16 * w + 10]).toBeGreaterThan(out[0]);
    });

    test("radialBlur: a single blocked pixel casts a shadow line away from the light", () => {
        const w = 32;
        const h = 32;
        const src = new Uint8Array(w * h).fill(255);
        src[16 * w + 16] = 0;
        const out = new Uint8Array(w * h);
        radialBlur(src, w, h, 4, 16, out);
        for (let x = 20; x <= 28; x++) {
            expect(out[16 * w + x]).toBeLessThan(out[10 * w + x]);
        }
        expect(out[16 * w + 10]).toBe(255);
    });

    test("radialBlur: light outside the buffer, on a pixel, saturated input — finite, clamped, no throw", () => {
        const w = 32;
        const h = 32;
        const src = new Uint8Array(w * h).fill(255);
        for (const [lx, ly] of [
            [-200, 16],
            [16, 16],
            [1000, 1000],
        ]) {
            const out = new Uint8Array(w * h);
            expect(() => radialBlur(src, w, h, lx, ly, out)).not.toThrow();
            expect(out.every((v) => v === 255)).toBe(true);
        }
    });

    test("downsample: a letter pixel marks its half-size cell", () => {
        const mask = new Uint8Array(4 * 4);
        mask[1 * 4 + 3] = 1; // (3,1) -> cell (1,0)
        expect(Array.from(downsample(mask, 4, 4))).toEqual([0, 1, 0, 0]);
    });
});
