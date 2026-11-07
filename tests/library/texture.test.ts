/*
 * @file    texture.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the perspective-correct textured polygon filler
 */

//----- imports
import { describe, test, expect } from "vitest";

import { TEXTURE_SIZE, SUBDIV, TexVertex, drawTexturedPolygon } from "library/gfx/texture";

//----- globals

// reference texel: u in the red byte, v in the green byte
const texel = (u: number, v: number): number => (0xff000000 | (v << 8) | u) >>> 0;

// 256x256 reference texture
const reference = new Uint32Array(TEXTURE_SIZE * TEXTURE_SIZE);
for (let v = 0; v < TEXTURE_SIZE; v++) for (let u = 0; u < TEXTURE_SIZE; u++) reference[(v << 8) | u] = texel(u, v);

// a texture filled with a single value
const plain = (value: number): Uint32Array => new Uint32Array(TEXTURE_SIZE * TEXTURE_SIZE).fill(value);

// a vertex
const vtx = (x: number, y: number, u: number, v: number, z: number = 1): TexVertex => ({ x, y, z, u, v });

// an axis-aligned rectangle [x0, x1) x [y0, y1) mapped on the whole texture
const rect = (x0: number, y0: number, x1: number, y1: number): TexVertex[] => [
    vtx(x0, y0, 0, 0),
    vtx(x1, y0, 256, 0),
    vtx(x1, y1, 256, 256),
    vtx(x0, y1, 0, 256),
];

// number of non-zero pixels
const count = (dst: Uint32Array): number => dst.reduce((n, p) => n + (p !== 0 ? 1 : 0), 0);

//----- tests
describe("drawTexturedPolygon", () => {
    test("constants", () => {
        expect(TEXTURE_SIZE).toBe(256);
        expect(SUBDIV).toBe(16);
    });

    test("a screen-aligned square at constant depth copies the texture 1:1", () => {
        const dst = new Uint32Array(256 * 256);
        drawTexturedPolygon(dst, 256, 256, rect(0, 0, 256, 256), reference);
        for (let y = 0; y < 256; y++)
            for (let x = 0; x < 256; x++) {
                if (dst[y * 256 + x] !== texel(x, y)) expect.fail(`pixel (${x}, ${y}) = ${dst[y * 256 + x]}`);
            }
    });

    test("the winding does not matter", () => {
        const cw = new Uint32Array(256 * 256);
        const ccw = new Uint32Array(256 * 256);
        const poly = rect(0, 0, 256, 256);
        drawTexturedPolygon(cw, 256, 256, poly, reference);
        drawTexturedPolygon(ccw, 256, 256, [...poly].reverse(), reference);
        expect(ccw).toEqual(cw);
    });

    test("two triangles sharing a diagonal cover every pixel exactly once", () => {
        const texture = plain(0xff000001);
        const a = new Uint32Array(128 * 128);
        const b = new Uint32Array(128 * 128);
        drawTexturedPolygon(a, 128, 128, [vtx(0, 0, 0, 0), vtx(100, 0, 256, 0), vtx(100, 100, 256, 256)], texture);
        drawTexturedPolygon(b, 128, 128, [vtx(0, 0, 0, 0), vtx(100, 100, 256, 256), vtx(0, 100, 0, 256)], texture);
        for (let y = 0; y < 128; y++)
            for (let x = 0; x < 128; x++) {
                const n = (a[y * 128 + x] !== 0 ? 1 : 0) + (b[y * 128 + x] !== 0 ? 1 : 0);
                const expected = x < 100 && y < 100 ? 1 : 0;
                if (n !== expected) expect.fail(`pixel (${x}, ${y}) covered ${n} times`);
            }
    });

    test("nothing is drawn outside the buffer", () => {
        const buf = new Uint32Array(64 + 64 * 64 + 64);
        const dst = new Uint32Array(buf.buffer, 4 * 64, 64 * 64);
        drawTexturedPolygon(dst, 64, 64, rect(-50, -50, 90, 90), reference);
        for (let i = 0; i < 64; i++) {
            expect(buf[i]).toBe(0);
            expect(buf[64 + 64 * 64 + i]).toBe(0);
        }
        expect(dst[0]).not.toBe(0);
        expect(dst[63 * 64 + 63]).not.toBe(0);
        expect(count(dst)).toBe(64 * 64);
    });

    test("spans not multiple of SUBDIV and 1-pixel spans are fully drawn", () => {
        const wide = new Uint32Array(64 * 4);
        drawTexturedPolygon(wide, 64, 4, rect(3, 0, 3 + 37, 2), reference);
        expect(count(wide)).toBe(74);

        const thin = new Uint32Array(64 * 4);
        drawTexturedPolygon(thin, 64, 4, rect(3, 0, 4, 2), reference);
        expect(count(thin)).toBe(2);
        expect(thin[3]).not.toBe(0);
        expect(thin[64 + 3]).not.toBe(0);
    });

    test("u/v at 256 never read outside the texture", () => {
        // every texel is non-zero in its low 24 bits: a read outside the texture (undefined) would give 0
        const texture = new Uint32Array(TEXTURE_SIZE * TEXTURE_SIZE);
        for (let i = 0; i < texture.length; i++) texture[i] = (0xff000000 | (i + 1)) >>> 0;
        const valid = (p: number): boolean => p >>> 24 === 0xff && (p & 0xffffff) >= 1 && (p & 0xffffff) <= 65536;

        const polygons: TexVertex[][] = [
            // uv up to 256 at the bottom-right corner
            rect(0, 0, 64, 64),
            // uv = 256 on the top-left corner, i.e. on drawn pixels
            [vtx(0, 0, 256, 256), vtx(64, 0, 0, 256), vtx(64, 64, 0, 0), vtx(0, 64, 256, 0)],
            // with perspective
            [vtx(0, 0, 256, 256, 1), vtx(64, 0, 0, 256, 5), vtx(64, 64, 0, 0, 5), vtx(0, 64, 256, 0, 1)],
            [vtx(0, 0, 0, 0, 5), vtx(64, 0, 256, 0, 1), vtx(64, 64, 256, 256, 1), vtx(0, 64, 0, 256, 5)],
        ];
        for (const poly of polygons) {
            const dst = new Uint32Array(64 * 64);
            drawTexturedPolygon(dst, 64, 64, poly, texture);
            for (let i = 0; i < dst.length; i++) if (!valid(dst[i])) expect.fail(`pixel ${i} = ${dst[i]}`);
        }
    });

    test("degenerate polygons draw nothing", () => {
        const dst = new Uint32Array(128 * 128);
        expect(() => {
            drawTexturedPolygon(
                dst,
                128,
                128,
                [vtx(0, 0, 0, 0), vtx(50, 50, 128, 128), vtx(100, 100, 256, 256)],
                reference,
            );
            drawTexturedPolygon(
                dst,
                128,
                128,
                [vtx(0, 10, 0, 0), vtx(50, 10, 128, 0), vtx(100, 10, 256, 0)],
                reference,
            );
            drawTexturedPolygon(dst, 128, 128, [vtx(0, 0, 0, 0), vtx(100, 100, 256, 256)], reference);
            drawTexturedPolygon(dst, 128, 128, [], reference);
        }).not.toThrow();
        expect(count(dst)).toBe(0);
    });

    test("perspective: the middle of a tilted quad is not the middle of the texture", () => {
        // left edge at depth 1, right edge at depth 4: the texture is compressed towards the right
        const dst = new Uint32Array(128 * 128);
        const poly = [vtx(0, 0, 0, 0, 1), vtx(100, 0, 256, 0, 4), vtx(100, 100, 256, 256, 4), vtx(0, 100, 0, 256, 1)];
        drawTexturedPolygon(dst, 128, 128, poly, reference);
        const u = dst[50 * 128 + 50] & 0xff;
        expect(u).toBeLessThan(100);
        // exact value: (u/z) / (1/z) = (256 / 4 / 2) / ((1 + 1 / 4) / 2) = 51.2 (+ the SUBDIV lerp error)
        expect(Math.abs(u - 51)).toBeLessThanOrEqual(2);
    });

    test("shade darkens the colour", () => {
        const dst = new Uint32Array(16 * 16);
        drawTexturedPolygon(dst, 16, 16, rect(0, 0, 16, 16), plain(0xffffffff), 0.5);
        for (const p of dst) {
            expect(p >>> 24).toBe(0xff);
            for (const shift of [0, 8, 16]) {
                const c = (p >>> shift) & 0xff;
                expect(c).toBeGreaterThanOrEqual(127);
                expect(c).toBeLessThanOrEqual(128);
            }
        }
    });

    test("shade 0 gives an opaque black", () => {
        const dst = new Uint32Array(16 * 16);
        drawTexturedPolygon(dst, 16, 16, rect(0, 0, 16, 16), plain(0x00ffffff), 0);
        for (const p of dst) expect(p).toBe(0xff000000);
    });
});
