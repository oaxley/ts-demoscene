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
import { Fractal } from "../../files/effects/ts-fractal/src/fractal";
import { Display } from "library/core/display";
import { FakeCanvas } from "../harness/dom";
import {
    TIMELINE,
    phaseAt,
    paletteIndex,
    colourShift,
    screenToKeyframe,
    nextKeyframe,
} from "../../files/effects/ts-fractal/src/zoom";

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

describe("ts-fractal zoom", () => {
    const LEVELS = KEYFRAMES.count - 1;
    const T = TIMELINE;
    const CYCLE = T.hold + T.zoom + T.fade;
    const SW = 640;
    const SH = 480;

    test("timeline: hold, zoom, fade, loop", () => {
        expect(phaseAt(0, T, LEVELS)).toEqual({ z: 0, fade: 0 });
        expect(phaseAt(T.hold - 1, T, LEVELS)).toEqual({ z: 0, fade: 0 });
        expect(phaseAt(T.hold + T.zoom, T, LEVELS).z).toBeCloseTo(LEVELS, 9);
        expect(phaseAt(T.hold + T.zoom, T, LEVELS).fade).toBe(0);
        expect(phaseAt(CYCLE - 1, T, LEVELS).fade).toBeGreaterThan(0.9);
        expect(phaseAt(CYCLE, T, LEVELS)).toEqual(phaseAt(0, T, LEVELS));
        expect(phaseAt(CYCLE + 500, T, LEVELS)).toEqual(phaseAt(500, T, LEVELS));

        let last = 0;
        for (let i = T.hold; i <= T.hold + T.zoom; i++) {
            const { z } = phaseAt(i, T, LEVELS);
            expect(z).toBeGreaterThanOrEqual(last);
            expect(z).toBeLessThanOrEqual(LEVELS + 1e-9);
            last = z;
        }
    });

    test("timeline: steady zoom in the middle", () => {
        const mid = T.hold + T.zoom / 2;
        const v1 = phaseAt(mid + 1, T, LEVELS).z - phaseAt(mid, T, LEVELS).z;
        const v2 = phaseAt(mid + 301, T, LEVELS).z - phaseAt(mid + 300, T, LEVELS).z;
        expect(v1).toBeCloseTo(v2, 9);
        // eased start: the first step is much smaller than the cruise step
        expect(phaseAt(T.hold + 1, T, LEVELS).z).toBeLessThan(v1 / 4);
    });

    test("palette index keeps 0 inside and stays in 1..255", () => {
        expect(paletteIndex(0, 37)).toBe(0);
        expect(paletteIndex(0, -300)).toBe(0);
        for (const shift of [-600.4, -1, 0, 0.6, 254, 1000]) {
            for (let v = 1; v < 256; v++) {
                const i = paletteIndex(v, shift);
                expect(i).toBeGreaterThanOrEqual(1);
                expect(i).toBeLessThanOrEqual(255);
            }
        }
        expect(paletteIndex(1, 0)).toBe(1);
        expect(paletteIndex(255, 1)).toBe(1);
    });

    test("seam: the last keyframe gets the colours of the first", () => {
        expect(colourShift(0, KEYFRAMES)).toBe(0);
        for (const v of [1, 100, 254]) {
            const vN = 1 + ((v - 1 + KEYFRAMES.colourOffset) % 255);
            expect(paletteIndex(vN, colourShift(LEVELS, KEYFRAMES))).toBe(paletteIndex(v, 0));
        }
        // the shift goes the short way round the palette
        expect(Math.abs(colourShift(LEVELS, KEYFRAMES))).toBeLessThanOrEqual(127.5);
    });

    test("the screen never leaves keyframe k", () => {
        const corners = [
            [0, 0],
            [SW - 1, 0],
            [0, SH - 1],
            [SW - 1, SH - 1],
        ];
        for (const f of [0, 0.25, 0.5, 0.75, 0.999]) {
            for (const [sx, sy] of corners) {
                // rounded to the nearest pixel by the renderer
                const [kx, ky] = screenToKeyframe(sx, sy, f, KEYFRAMES, SW);
                expect(kx).toBeGreaterThanOrEqual(-0.5);
                expect(kx).toBeLessThan(KEYFRAMES.width - 0.5);
                expect(ky).toBeGreaterThanOrEqual(-0.5);
                expect(ky).toBeLessThan(KEYFRAMES.height - 0.5);
            }
        }
        // at f = 0, one keyframe pixel per screen pixel, centred
        const s = KEYFRAMES.view / SW;
        const [x, y] = screenToKeyframe(SW - 1, SH - 1, 0, KEYFRAMES, SW);
        expect(x).toBeCloseTo((KEYFRAMES.width + KEYFRAMES.view) / 2 - 0.5 - 0.5 * s, 9);
        expect(y).toBeCloseTo((KEYFRAMES.height + SH * s) / 2 - 0.5 - 0.5 * s, 9);
    });

    test("keyframe k+1 covers the whole screen, never magnified", () => {
        for (const f of [0, 0.25, 0.5, 0.75, 0.999]) {
            const [ox, oy] = nextKeyframe(...screenToKeyframe(0, 0, f, KEYFRAMES, SW), KEYFRAMES);
            const [xx, xy] = nextKeyframe(...screenToKeyframe(SW - 1, 0, f, KEYFRAMES, SW), KEYFRAMES);
            for (const [sx, sy] of [
                [0, 0],
                [SW - 1, 0],
                [0, SH - 1],
                [SW - 1, SH - 1],
            ]) {
                const [nx, ny] = nextKeyframe(...screenToKeyframe(sx, sy, f, KEYFRAMES, SW), KEYFRAMES);
                expect(nx).toBeGreaterThanOrEqual(-0.5);
                expect(nx).toBeLessThan(KEYFRAMES.width - 0.5);
                expect(ny).toBeGreaterThanOrEqual(-0.5);
                expect(ny).toBeLessThan(KEYFRAMES.height - 0.5);
            }
            // at least one keyframe k+1 pixel per screen pixel
            expect(Math.hypot(xx - ox, xy - oy) / (SW - 1)).toBeGreaterThanOrEqual(1 - 1e-9);
        }
    });

    test("continuity: f -> 1 on keyframe k is f = 0 on keyframe k+1", () => {
        for (const [sx, sy] of [
            [0, 0],
            [SW - 1, 0],
            [0, SH - 1],
            [SW - 1, SH - 1],
            [SW / 2, SH / 2],
        ]) {
            const [kx, ky] = screenToKeyframe(sx, sy, 1 - 1e-9, KEYFRAMES, SW);
            const [nx, ny] = nextKeyframe(kx, ky, KEYFRAMES);
            const [x0, y0] = screenToKeyframe(sx, sy, 0, KEYFRAMES, SW);
            expect(Math.hypot(nx - x0, ny - y0)).toBeLessThan(0.01);
        }
    });

    test("keyframe k -> k+1 follows the real zoom geometry", () => {
        const S: Complex = { re: -0.743643887037151, im: 0.13182590420533 };
        const n = nucleus(S, 35);
        const s = sizeEstimate(n, 35);
        const zoom: ZoomPath = { c0: { re: -0.6, im: 0 }, w0: 3.6, n, s, levels: LEVELS };
        const { width: w, height: h } = KEYFRAMES;

        // complex point of a keyframe pixel (same convention as the generator)
        const toComplex = (k: number, x: number, y: number): Complex => {
            const v = viewAt(zoom, k);
            const px = v.width / KEYFRAMES.view;
            const du = (x + 0.5 - w / 2) * px;
            const dv = (h / 2 - (y + 0.5)) * px;
            const c = Math.cos(v.angle);
            const sn = Math.sin(v.angle);
            return { re: v.centre.re + du * c - dv * sn, im: v.centre.im + du * sn + dv * c };
        };

        for (const k of [0, 10, LEVELS - 1]) {
            for (const [x, y] of [
                [300, 200],
                [600, 400],
                [KEYFRAMES.pivot.x + 20, KEYFRAMES.pivot.y - 30],
            ]) {
                const [nx, ny] = nextKeyframe(x, y, KEYFRAMES);
                const a = toComplex(k, x, y);
                const b = toComplex(k + 1, nx, ny);
                // within a hundredth of a keyframe k+1 pixel
                expect(dist(a, b)).toBeLessThan((viewAt(zoom, k + 1).width / KEYFRAMES.view) * 0.01);
            }
        }
    });
});

describe("ts-fractal playback", () => {
    // the frame just before a keyframe change must be the frame just after it,
    // everywhere on the screen (a jump in detail at each keyframe reads as a hitch)
    test("no jump at the keyframe changes", async () => {
        const canvas = new FakeCanvas(640, 480);
        const fractal = new Fractal(new Display(canvas as unknown as HTMLCanvasElement));
        fractal.setup();
        for (let i = 0; i < 800 && !fractal.isAnimated; i++) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const internals = fractal as unknown as { phase_: { z: number; fade: number }; render(): void };
        const frame = (z: number): Uint8ClampedArray => {
            internals.phase_ = { z, fade: 0 };
            internals.render();
            return canvas.getContext("2d").buffer.slice();
        };
        const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray, border: boolean): number => {
            let d = 0;
            let n = 0;
            for (let y = 0; y < 480; y++) {
                for (let x = 0; x < 640; x++) {
                    const edge = x < 80 || x >= 560 || y < 60 || y >= 420;
                    if (edge !== border) continue;
                    const p = (y * 640 + x) * 4;
                    d += Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
                    n++;
                }
            }
            return d / n;
        };

        for (const k of [5, 12, 20]) {
            const before = frame(k - 1e-3);
            const after = frame(k);
            // one frame of the steady zoom, as a yardstick
            const step = (KEYFRAMES.count - 1) / (TIMELINE.zoom - TIMELINE.ease);
            const moved = frame(k + step);
            for (const border of [false, true]) {
                expect(diff(before, after, border)).toBeLessThan(diff(after, moved, border) * 0.25);
            }
        }
    }, 120_000);
});
