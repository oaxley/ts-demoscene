/*
 * @file    brush.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-brush building blocks (stroke data, layout, brush, pen, restart)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { WORD, layoutWord } from "../../files/effects/ts-brush/src/kanji";
import { Brush, BrushState, brushStep, penIndex, cycleFrames } from "../../files/effects/ts-brush/src/brush";
import { runEffect, WIDTH, HEIGHT } from "../harness/runner";

//----- tests
describe("ts-brush kanji", () => {
    test("生きがい has 5, 4, 5 and 2 strokes", () => {
        expect(WORD.map((c) => c.length)).toEqual([5, 4, 5, 2]);
    });

    test("layout returns the 16 strokes in writing order", () => {
        const strokes = layoutWord(640, 480, 1);
        expect(strokes.length).toBe(16);
        expect(strokes.map((s) => s.char)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3]);
        expect(strokes.every((s) => s.points.length > 1)).toBe(true);
    });

    test("every point stays on screen, away from the borders", () => {
        for (const s of layoutWord(640, 480, 1)) {
            for (const p of s.points) {
                expect(p.x).toBeGreaterThanOrEqual(10);
                expect(p.x).toBeLessThanOrEqual(630);
                expect(p.y).toBeGreaterThanOrEqual(10);
                expect(p.y).toBeLessThanOrEqual(470);
            }
        }
    });

    test("characters go left to right, the row is centred", () => {
        const strokes = layoutWord(640, 480, 1);
        const mean = (c: number): number => {
            const pts = strokes.filter((s) => s.char === c).flatMap((s) => s.points);
            return pts.reduce((a, p) => a + p.x, 0) / pts.length;
        };
        expect(mean(0)).toBeLessThan(mean(1));
        expect(mean(1)).toBeLessThan(mean(2));
        expect(mean(2)).toBeLessThan(mean(3));

        const all = strokes.flatMap((s) => s.points);
        const xs = all.map((p) => p.x);
        const ys = all.map((p) => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        expect(Math.abs(cx - 320)).toBeLessThan(40);
        expect(Math.abs(cy - 240)).toBeLessThan(40);
    });

    test("points are about `step` pixels apart on screen", () => {
        const s = layoutWord(640, 480, 2)[2]; // 生, long vertical stroke
        const d = Math.hypot(s.points[5].x - s.points[4].x, s.points[5].y - s.points[4].y);
        expect(d).toBeCloseTo(2, 1);
    });
});

describe("ts-brush brush", () => {
    const rest = (): BrushState => ({ x: 0, y: 0, vx: 0, vy: 0, v: 0, r: 10 });

    test("the spring brings the brush to a still pen", () => {
        const s = rest();
        for (let i = 0; i < 60; i++) {
            brushStep(s, 100, 50, 10);
        }
        expect(Math.abs(s.x - 100)).toBeLessThan(0.5);
        expect(Math.abs(s.y - 50)).toBeLessThan(0.5);
        expect(Math.abs(s.vx)).toBeLessThan(0.1);
        expect(Math.abs(s.vy)).toBeLessThan(0.1);
    });

    test("the brush is thinner when it moves fast", () => {
        const still = rest();
        const fast = rest();
        for (let i = 0; i < 20; i++) {
            brushStep(still, 0, 0, 10);
            brushStep(fast, 20 * i, 0, 10);
        }
        expect(fast.r).toBeLessThan(still.r);
        expect(still.r).toBeCloseTo(10, 5);
    });

    test("the pen eases in and out along a stroke", () => {
        const n = 101;
        expect(penIndex(0, n)).toBe(0);
        expect(penIndex(1, n)).toBe(n - 1);
        let prev = 0;
        for (let t = 0; t <= 1.0001; t += 0.05) {
            const i = penIndex(Math.min(t, 1), n);
            expect(i).toBeGreaterThanOrEqual(prev);
            prev = i;
        }
        expect(penIndex(0.1, n) - penIndex(0, n)).toBeLessThan(penIndex(0.55, n) - penIndex(0.45, n));
    });
});

describe("ts-brush animation", () => {
    test("the second pass renders exactly like the first", async () => {
        const cycle = cycleFrames(WIDTH, HEIGHT);
        expect(cycle).toBeGreaterThan(100);
        // harness frame k = effect frame k-1 (the first run() only starts the throttle)
        const res = await runEffect(Brush, cycle + 41, 1);
        for (const k of [5, 19, 40]) {
            expect(res.checkpoints[String(cycle + k)]).toBe(res.checkpoints[String(k)]);
        }
        // and the frames really change while writing
        expect(res.checkpoints["5"]).not.toBe(res.checkpoints["40"]);
    }, 60000);
});
