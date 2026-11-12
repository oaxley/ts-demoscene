/*
 * @file    pixels.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the whole-buffer pixel helpers
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { BAYER4, applyPalette, fadeToColor, mixToBuffer, redChannel } from "library/gfx/pixels";

//----- tests
describe("pixels", () => {
    test("BAYER4 thresholds are centred in [0, 1)", () => {
        expect(BAYER4).toHaveLength(16);
        expect(BAYER4[0]).toBe(0.5 / 16);
        expect(BAYER4[1]).toBe(8.5 / 16);
        expect(new Set(BAYER4).size).toBe(16);
    });

    test("applyPalette maps every index", () => {
        const dst = new Uint32Array(2);
        applyPalette(new Uint8Array([2, 0]), new Uint32Array([10, 20, 30]), dst);
        expect(Array.from(dst)).toEqual([30, 10]);
    });

    test("fadeToColor: a = 256 lands on the colour, a = 0 keeps the pixel (opaque)", () => {
        const c = RGBA.toUInt32(10, 20, 30);
        const p = RGBA.toUInt32(200, 100, 50, 0);

        const full = new Uint32Array([p]);
        fadeToColor(full, c, 256);
        expect(full[0]).toBe(RGBA.toUInt32(10, 20, 30));

        const none = new Uint32Array([p]);
        fadeToColor(none, c, 0);
        expect(none[0]).toBe(RGBA.toUInt32(200, 100, 50));

        const half = new Uint32Array([RGBA.toUInt32(0, 0, 0)]);
        fadeToColor(half, RGBA.toUInt32(200, 100, 50), 128);
        expect(half[0]).toBe(RGBA.toUInt32(100, 50, 25));
    });

    test("mixToBuffer: k = 256 keeps dst, k = 0 gives base", () => {
        const base = new Uint32Array([RGBA.toUInt32(10, 20, 30)]);
        const p = RGBA.toUInt32(200, 100, 50);

        const keep = new Uint32Array([p]);
        mixToBuffer(keep, base, 256);
        expect(keep[0]).toBe(p);

        const back = new Uint32Array([p]);
        mixToBuffer(back, base, 0);
        expect(back[0]).toBe(base[0]);
    });

    test("redChannel reads red and checks the size", () => {
        const s = new Surface({ width: 2, height: 1 });
        s.data32[0] = RGBA.toUInt32(7, 1, 2);
        s.data32[1] = RGBA.toUInt32(255, 3, 4);
        expect(Array.from(redChannel(s, 2, 1, "Mask"))).toEqual([7, 255]);
        expect(() => redChannel(s, 2, 2, "Mask")).toThrow("Mask is 2x1, expected 2x2.");
    });

    test("Surface.fill sets every pixel", () => {
        const s = new Surface({ width: 3, height: 2 });
        s.fill(0xff000000);
        expect(Array.from(s.data32)).toEqual(new Array(6).fill(0xff000000));
        s.fill(new RGBA(1, 2, 3));
        expect(s.data32[5]).toBe(RGBA.toUInt32(1, 2, 3));
    });
});
