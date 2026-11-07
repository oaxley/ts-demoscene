/*
 * @file    bump.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-bump building blocks (blur, slopes, light spot, light path, shading)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
import { blur, slopes, lightSpot, lightPath, shade, heights, SPOT_SIZE } from "../../files/effects/ts-bump/src/bump";

//----- tests
describe("ts-bump", () => {
    test("blur spreads a single bright pixel, keeps a flat map flat", () => {
        const w = 9;
        const h = 9;
        const map = new Uint8Array(w * h);
        map[4 * w + 4] = 255;
        const out = blur(map, w, h, 1);
        expect(out[4 * w + 4]).toBeLessThan(255);
        expect(out[4 * w + 5]).toBeGreaterThan(0);
        expect(out[0]).toBe(0);

        const flat = blur(new Uint8Array(w * h).fill(100), w, h, 3);
        expect(Array.from(flat).every((v) => v === 100)).toBe(true);
    });

    test("heights: red channel of the height map image, which must match the screen size", () => {
        const image = new Surface({ width: 4, height: 2 });
        image.data32[1] = 0xff3c3c3c >>> 0;
        expect(Array.from(heights(image, 4, 2))).toEqual([0, 0x3c, 0, 0, 0, 0, 0, 0]);

        expect(() => heights(image, 640, 480)).toThrow("640x480");
    });

    test("slopes follow the height gradient, zero on flat areas", () => {
        const w = 5;
        const h = 5;
        // height = 10 * x
        const map = new Uint8Array(w * h).map((_, i) => 10 * (i % w));
        const { nx, ny } = slopes(map, w, h);
        expect(nx[2 * w + 2]).toBe(20); // h(x+1) - h(x-1)
        expect(ny[2 * w + 2]).toBe(0);
        // borders are left flat
        expect(nx[0]).toBe(0);
    });

    test("light spot is brightest in the centre and black outside its radius", () => {
        const spot = lightSpot();
        const c = SPOT_SIZE >> 1;
        expect(spot.length).toBe(SPOT_SIZE * SPOT_SIZE);
        expect(spot[c * SPOT_SIZE + c]).toBe(255);
        expect(spot[c * SPOT_SIZE + c + 40]).toBeLessThan(spot[c * SPOT_SIZE + c + 10]);
        expect(spot[0]).toBe(0);
    });

    test("light path stays on screen and moves slowly", () => {
        for (let f = 0; f < 5000; f += 7) {
            const p = lightPath(f, 640, 480);
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThan(640);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThan(480);

            const q = lightPath(f + 1, 640, 480);
            expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(4);
        }
    });

    test("shade: a flat surface is lit by distance only, slopes facing the light are brighter", () => {
        const w = 64;
        const h = 64;
        const spot = lightSpot();
        const flat = new Int16Array(w * h);
        const out = new Uint8Array(w * h);

        // light on (32, 32): centre is fully lit, far corner is dark
        shade(flat, flat, spot, 32, 32, w, h, out);
        expect(out[32 * w + 32]).toBe(255);
        expect(out[1 * w + 1]).toBeLessThan(out[32 * w + 32]);

        // a slope toward the light (nx < 0 left of the light) gets brighter than flat
        const nx = new Int16Array(w * h);
        nx[32 * w + 20] = -10;
        shade(nx, flat, spot, 32, 32, w, h, out);
        const sloped = out[32 * w + 20];
        shade(flat, flat, spot, 32, 32, w, h, out);
        expect(sloped).toBeGreaterThan(out[32 * w + 20]);

        // 1-pixel border is black
        expect(out[0]).toBe(0);
        expect(out[w - 1]).toBe(0);
    });
});
