/*
 * @file    brush.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-brush building blocks (stroke data, layout)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { WORD, layoutWord } from "../../files/effects/ts-brush/src/kanji";

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
