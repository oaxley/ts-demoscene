/*
 * @file    polygon.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the flat blended (glass) polygon filler
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Point2D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";
import { fillGlassPolygon } from "library/gfx/polygon";

//----- globals
const W = 16;
const H = 16;
const BLACK = RGBA.toUInt32(0, 0, 0);
const WHITE = RGBA.toUInt32(255, 255, 255);
const ONCE = 0x7f; // white over black at alpha 0.5, blended once: (255 * 128) >> 8
const TWICE = 0xbf; // ... blended twice: 127 + ((128 * 128) >> 8)

// a buffer filled with a colour
const buffer = (value: number = BLACK): Uint32Array => new Uint32Array(W * H).fill(value);

// pixel at (x, y)
const px = (dst: Uint32Array, x: number, y: number): number => dst[y * W + x];

// a point
const pt = (x: number, y: number): Point2D => ({ x, y });

// an axis-aligned rectangle (x0, y0) - (x1, y1), clockwise on screen
const rect = (x0: number, y0: number, x1: number, y1: number): Point2D[] => [
    pt(x0, y0),
    pt(x1, y0),
    pt(x1, y1),
    pt(x0, y1),
];

// number of pixels different from a value
const changed = (dst: Uint32Array, value: number): number => dst.reduce((n, p) => n + (p !== value ? 1 : 0), 0);

// red channel of every pixel
const reds = (dst: Uint32Array): number[] => Array.from(dst, (p) => p & 0xff);

// =true when (x, y) is inside the convex polygon by more than eps (any winding)
function inside(poly: Point2D[], x: number, y: number, eps: number): boolean {
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const d = ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)) / len;
        if (Math.abs(d) <= eps) return false;
        const s = d > 0 ? 1 : -1;
        if (sign !== 0 && s !== sign) return false;
        sign = s;
    }
    return true;
}

//----- tests
describe("fillGlassPolygon", () => {
    const color = RGBA.toUInt32(10, 20, 30);
    const solid = (color | 0xff000000) >>> 0;

    test("fills the pixel centres of an axis-aligned rectangle", () => {
        const dst = buffer();
        fillGlassPolygon(dst, W, H, rect(2, 3, 6, 7), color, 1);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const expected = x >= 2 && x < 6 && y >= 3 && y < 7 ? solid : BLACK;
                expect(px(dst, x, y)).toBe(expected);
            }
        }
        expect(changed(dst, BLACK)).toBe(16);
    });

    test("any winding", () => {
        const cw = buffer();
        const ccw = buffer();
        const poly = [pt(1.3, 2.2), pt(11.7, 3.1), pt(9.4, 12.8), pt(2.1, 10.5)];
        fillGlassPolygon(cw, W, H, poly, color, 1);
        fillGlassPolygon(ccw, W, H, [...poly].reverse(), color, 1);
        expect(changed(cw, BLACK)).toBeGreaterThan(50);
        expect(Array.from(ccw)).toEqual(Array.from(cw));
    });

    describe("shared edges, no overlap and no hole", () => {
        // the pieces and the whole shape, drawn at alpha 0.5 in white on black
        const pieces = (polys: Point2D[][]): Uint32Array => {
            const dst = buffer();
            polys.forEach((p) => fillGlassPolygon(dst, W, H, p, WHITE, 0.5));
            return dst;
        };

        test("two squares sharing a vertical edge", () => {
            const split = pieces([rect(1.2, 2.3, 5.5, 9.7), rect(5.5, 2.3, 11.6, 9.7)]);
            const whole = pieces([rect(1.2, 2.3, 11.6, 9.7)]);
            expect(reds(split)).not.toContain(TWICE);
            expect(reds(split)).toContain(ONCE);
            expect(Array.from(split)).toEqual(Array.from(whole));
        });

        test("two triangles splitting a square along a diagonal", () => {
            const [a, b, c, d] = rect(1.3, 1.7, 9.6, 8.2);
            const split = pieces([
                [a, b, c],
                [a, c, d],
            ]);
            const whole = pieces([[a, b, c, d]]);
            expect(reds(split)).not.toContain(TWICE);
            expect(Array.from(split)).toEqual(Array.from(whole));
        });

        test("a 4x4 grid of cells of a skewed quad", () => {
            const quad = [pt(1.2, 0.7), pt(13.9, 2.1), pt(12.4, 14.6), pt(0.4, 12.3)];
            const [A, B, C, D] = quad;
            const G = 4;
            const grid: Point2D[] = [];
            for (let j = 0; j <= G; j++) {
                for (let i = 0; i <= G; i++) {
                    const top = pt((A.x * (G - i) + B.x * i) / G, (A.y * (G - i) + B.y * i) / G);
                    const bot = pt((D.x * (G - i) + C.x * i) / G, (D.y * (G - i) + C.y * i) / G);
                    grid.push(pt((top.x * (G - j) + bot.x * j) / G, (top.y * (G - j) + bot.y * j) / G));
                }
            }
            const cells: Point2D[][] = [];
            const at = (i: number, j: number) => grid[j * (G + 1) + i];
            for (let j = 0; j < G; j++) {
                for (let i = 0; i < G; i++) {
                    cells.push([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
                }
            }

            const dst = pieces(cells);
            expect(reds(dst)).not.toContain(TWICE);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (inside(quad, x, y, 1e-6)) {
                        expect(px(dst, x, y) & 0xff).toBe(ONCE);
                    }
                }
            }
        });
    });

    test("blend values", () => {
        const d = RGBA.toUInt32(200, 100, 0);
        const c = RGBA.toUInt32(0, 100, 200);

        const half = buffer(d);
        fillGlassPolygon(half, W, H, rect(0, 0, 1, 1), c, 0.5);
        expect(RGBA.fromUInt32(px(half, 0, 0))).toEqual([100, 100, 100, 255]);

        const none = buffer(d);
        fillGlassPolygon(none, W, H, rect(0, 0, 1, 1), c, 0);
        expect(px(none, 0, 0)).toBe(d);

        const full = buffer(d);
        fillGlassPolygon(full, W, H, rect(0, 0, 1, 1), c, 1);
        expect(px(full, 0, 0)).toBe(c);

        // the alpha byte of the drawn pixels is forced to 0xff
        const clear = new Uint32Array(W * H).fill(0x00102030);
        fillGlassPolygon(clear, W, H, rect(0, 0, 1, 1), c, 0.5);
        expect(px(clear, 0, 0) >>> 24).toBe(0xff);
        expect(px(clear, 1, 0)).toBe(0x00102030);
    });

    test("alpha is clamped", () => {
        const d = RGBA.toUInt32(200, 100, 0);
        const c = RGBA.toUInt32(0, 100, 200);

        const low = buffer(d);
        fillGlassPolygon(low, W, H, rect(2, 2, 8, 8), c, -1);
        expect(changed(low, d)).toBe(0);

        const high = buffer(d);
        fillGlassPolygon(high, W, H, rect(2, 2, 8, 8), c, 2);
        expect(px(high, 4, 4)).toBe(c);
    });

    test("clipped to the buffer", () => {
        const all = buffer();
        expect(() =>
            fillGlassPolygon(all, W, H, [pt(-5, -5), pt(30, -3), pt(25, 30), pt(-4, 20)], color, 1),
        ).not.toThrow();
        expect(changed(all, solid)).toBe(0);

        const outside = buffer();
        fillGlassPolygon(outside, W, H, rect(16, 2, 30, 8), color, 1);
        fillGlassPolygon(outside, W, H, rect(-30, 2, -1, 8), color, 1);
        fillGlassPolygon(outside, W, H, rect(2, -30, 8, -1), color, 1);
        fillGlassPolygon(outside, W, H, rect(2, 16, 8, 30), color, 1);
        expect(changed(outside, BLACK)).toBe(0);

        // a rectangle straddling the right edge never wraps into the next row
        const right = buffer();
        fillGlassPolygon(right, W, H, rect(12, 4, 40, 5), color, 1);
        expect(changed(right, BLACK)).toBe(4);
        expect(px(right, 0, 5)).toBe(BLACK);
        expect(px(right, 15, 4)).toBe(solid);
    });

    test("degenerate", () => {
        const dst = buffer();
        const draw = (poly: Point2D[]) => expect(() => fillGlassPolygon(dst, W, H, poly, color, 1)).not.toThrow();
        draw([]);
        draw([pt(3, 3)]);
        draw([pt(3, 3), pt(9, 9)]);
        draw([pt(0, 0), pt(5, 5), pt(10, 10)]);
        draw([pt(1, 4), pt(12, 4), pt(7, 4)]);
        expect(changed(dst, BLACK)).toBe(0);
    });
});
