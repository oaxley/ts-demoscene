/*
 * @file    fractal.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-fractal: Mandelbrot maths, keyframes and zoom timeline
 */

//----- imports
import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

import {
    Complex,
    ZoomPath,
    smoothEscape,
    findPeriod,
    nucleus,
    sizeEstimate,
    viewAt,
    fixedPoint,
} from "../../scripts/fractal/mandel";
import { KEYFRAMES, keyframeUrl } from "../../files/effects/ts-fractal/src/keyframes";

//----- helpers
const dist = (a: Complex, b: Complex): number => Math.hypot(a.re - b.re, a.im - b.im);
const mul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });

//----- tests
describe("ts-fractal mandel", () => {
    const S: Complex = { re: -0.743643887037151, im: 0.13182590420533 };
    const DEEP: Complex = { re: -0.7436439013893973, im: 0.13182587743631075 };

    test("smooth escape count", () => {
        expect(smoothEscape(0, 0, 1000)).toBe(-1);
        const far = smoothEscape(2, 2, 1000);
        expect(far).toBeGreaterThanOrEqual(0);
        expect(far).toBeLessThan(2);
        expect(smoothEscape(-0.75, 0.1, 1000)).toBeGreaterThan(smoothEscape(-0.75, 0.2, 1000));
    });

    test("period and nucleus of the seahorse mini-Mandelbrots", () => {
        expect(findPeriod(S, 1e-8, 100000)).toBe(936);
        expect(findPeriod(S, 1e-4, 100000)).toBe(39);
        expect(dist(nucleus(S, 936), DEEP)).toBeLessThan(1e-14);
    });

    test("size estimate of the period 39 mini-Mandelbrot", () => {
        const n = { re: -0.7436423016578859, im: 0.13182651981259472 };
        const s = sizeEstimate(n, 39);
        expect(Math.abs(Math.hypot(s.re, s.im) / 2.17e-6 - 1)).toBeLessThan(0.1);
    });

    test("zoom path ends on the mini-Mandelbrot copy of view 0", () => {
        const n = nucleus(S, 936);
        const s = sizeEstimate(n, 936);
        const ms = Math.hypot(s.re, s.im);
        const N = Math.round(Math.log2(1 / ms));
        const path: ZoomPath = { c0: { re: -0.6, im: 0 }, w0: 3.6, n, s, levels: N };

        const v0 = viewAt(path, 0);
        expect(dist(v0.centre, path.c0)).toBeLessThan(1e-15);
        expect(v0.width).toBeCloseTo(3.6, 12);
        expect(v0.angle).toBe(0);

        const vN = viewAt(path, N);
        const expected = mul(s, path.c0);
        expected.re += n.re;
        expected.im += n.im;
        expect(dist(vN.centre, expected)).toBeLessThan(1e-12 * ms + 1e-16);
        expect(Math.abs(vN.width / (3.6 * ms) - 1)).toBeLessThan(1e-9);

        const p = fixedPoint(path);
        const image = mul(s, p);
        expect(dist({ re: image.re + n.re, im: image.im + n.im }, p)).toBeLessThan(1e-15);
    });
});

describe("ts-fractal keyframes", () => {
    const ASSETS = path.resolve(import.meta.dirname, "../../files/effects/ts-fractal/assets");
    const pad2 = (i: number): string => String(i).padStart(2, "0");

    test("every keyframe image exists with the declared size", () => {
        expect(KEYFRAMES.count).toBeGreaterThan(10);
        for (let i = 0; i < KEYFRAMES.count; i++) {
            const png = PNG.sync.read(fs.readFileSync(path.join(ASSETS, `kf-${pad2(i)}.png`)));
            expect([png.width, png.height]).toEqual([KEYFRAMES.width, KEYFRAMES.height]);
        }
        expect(fs.existsSync(path.join(ASSETS, `kf-${pad2(KEYFRAMES.count)}.png`))).toBe(false);
    });

    test("keyframe URL", () => {
        expect(keyframeUrl(3)).toBe("/images/assets/ts-fractal.kf-03.png");
    });

    test("zoom step metadata", () => {
        expect(KEYFRAMES.ratio).toBeGreaterThanOrEqual(1.8);
        expect(KEYFRAMES.ratio).toBeLessThanOrEqual(2.2);
        expect(Math.abs(KEYFRAMES.stepAngle)).toBeLessThan(0.3);
        expect(KEYFRAMES.pivot.x).toBeGreaterThanOrEqual(0);
        expect(KEYFRAMES.pivot.x).toBeLessThan(KEYFRAMES.width);
        expect(KEYFRAMES.pivot.y).toBeGreaterThanOrEqual(0);
        expect(KEYFRAMES.pivot.y).toBeLessThan(KEYFRAMES.height);
        expect(KEYFRAMES.colourOffset).toBeGreaterThanOrEqual(0);
        expect(KEYFRAMES.colourOffset).toBeLessThan(255);
    });
});
