/*
 * @file    svgpath.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the SVG path parser and arc-length sampler
 */

//----- imports
import { describe, test, expect } from "vitest";

import { parsePath, samplePath } from "library/maths/svgpath";

//----- tests
describe("parsePath", () => {
    test("relative cubic is relative to the current point", () => {
        expect(parsePath("M10,20c1,2,3,4,5,6")).toEqual([
            { p0: { x: 10, y: 20 }, p1: { x: 11, y: 22 }, p2: { x: 13, y: 24 }, p3: { x: 15, y: 26 } },
        ]);
    });

    test("absolute then relative cubic", () => {
        const segs = parsePath("M0,0C1,1,2,2,3,3c1,0,2,0,3,0");
        expect(segs.length).toBe(2);
        expect(segs[1].p0).toEqual({ x: 3, y: 3 });
        expect(segs[1].p3).toEqual({ x: 6, y: 3 });
    });

    test("implicit repeat of a command", () => {
        const segs = parsePath("M0,0c1,0,2,0,3,0,1,0,2,0,3,0");
        expect(segs.length).toBe(2);
        expect(segs[1].p3).toEqual({ x: 6, y: 0 });
    });

    test("negative numbers without separators", () => {
        const segs = parsePath("M31.26,25.89c0.36,1.36,0.35,2.65-0.05,3.79");
        expect(segs[0].p3.x).toBeCloseTo(31.21, 5);
        expect(segs[0].p3.y).toBeCloseTo(29.68, 5);
    });

    test("S reflects the previous control point", () => {
        const segs = parsePath("M0,0C0,10,10,10,10,0S20,-10,20,0");
        expect(segs[1].p1).toEqual({ x: 10, y: -10 });
        expect(segs[1].p3).toEqual({ x: 20, y: 0 });
    });

    test("s without a previous cubic uses the current point", () => {
        const segs = parsePath("M5,5s1,1,2,2");
        expect(segs[0].p1).toEqual({ x: 5, y: 5 });
        expect(segs[0].p2).toEqual({ x: 6, y: 6 });
        expect(segs[0].p3).toEqual({ x: 7, y: 7 });
    });

    test("unknown command throws", () => {
        expect(() => parsePath("M0,0L1,1")).toThrow(/L/);
    });
});

describe("samplePath", () => {
    test("straight cubic: evenly spaced points on the line", () => {
        const pts = samplePath("M0,0C1,0,2,0,3,0", 0.5);
        expect(pts[0]).toEqual({ x: 0, y: 0 });
        expect(pts[pts.length - 1].x).toBeCloseTo(3, 6);
        expect(pts.every((p) => p.y === 0)).toBe(true);
        for (let i = 1; i < pts.length - 1; i++) {
            const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
            expect(Math.abs(d - 0.5)).toBeLessThan(0.05);
        }
    });

    test("a KanjiVG stroke (生, stroke 3)", () => {
        const pts = samplePath("M52.31,12.63c1.28,1.28,2.01,3.12,2.01,5.23c0,4.01,0,65.14,0,69.77", 1);
        expect(pts[0].x).toBeCloseTo(52.31, 5);
        expect(pts[0].y).toBeCloseTo(12.63, 5);
        expect(pts[pts.length - 1].x).toBeCloseTo(54.32, 5);
        expect(pts[pts.length - 1].y).toBeCloseTo(87.63, 5);
        expect(pts.length).toBeGreaterThanOrEqual(74);
        expect(pts.length).toBeLessThanOrEqual(80);
    });

    test("zero-length path gives a single point, no NaN", () => {
        expect(samplePath("M5,5c0,0,0,0,0,0", 1)).toEqual([{ x: 5, y: 5 }]);
    });
});
