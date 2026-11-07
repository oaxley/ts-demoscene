/*
 * @file    lens.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-lens bubble rendering (tint, rim, highlight) on known backgrounds
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
import { LensAnimation } from "../../files/effects/ts-lens/src/lens_anim";

//----- globals
const SIZE = 200;
const C = 100; // lens centre
const R = 40; // lens radius
const ZOOM = 20;

//----- helpers
// surface filled by a pixel function (returns 0xAABBGGRR)
function surface(fill: (x: number, y: number) => number): Surface {
    const s = new Surface({ width: SIZE, height: SIZE });
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            s.data32[y * SIZE + x] = fill(x, y) >>> 0;
        }
    }
    return s;
}

const WHITE = 0xffffffff;

function rgba(s: Surface, x: number, y: number): [number, number, number, number] {
    const v = s.data32[y * SIZE + x];
    return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, v >>> 24];
}

function lensOn(s: Surface): Surface {
    new LensAnimation(s, R, ZOOM).compute(C, C);
    return s;
}

//----- tests
describe("ts-lens bubble", () => {
    test("tints the centre of the bubble", () => {
        const s = lensOn(surface(() => WHITE));
        expect(rgba(s, C, C)).toEqual([229, 229, 248, 255]);
    });

    test("leaves pixels outside the bubble untouched", () => {
        const s = lensOn(surface(() => WHITE));
        for (const [x, y] of [
            [C - R - 3, C],
            [C, C + R + 3],
            [C - R - 1, C - R - 1], // corner of the lens box
        ]) {
            expect(rgba(s, x, y), `${x},${y}`).toEqual([255, 255, 255, 255]);
        }
    });

    test("draws a bluish rim", () => {
        const s = lensOn(surface(() => WHITE));
        const [r, , b] = rgba(s, C + R, C);
        expect(b).toBeGreaterThan(r);
        expect(r).toBeLessThan(229);
    });

    test("draws the highlight bottom-left only", () => {
        const s = lensOn(surface(() => WHITE));
        const at = (deg: number) => {
            const a = (deg * Math.PI) / 180;
            return rgba(s, Math.floor(C + 30 * Math.cos(a)), Math.floor(C + 30 * Math.sin(a)));
        };
        expect(at(150)[0]).toBeLessThan(at(-30)[0]);
    });

    test("never overflows a channel (bluish everywhere, opaque)", () => {
        const s = lensOn(surface(() => WHITE));
        for (let y = C - R - 5; y < C + R + 5; y++) {
            for (let x = C - R - 5; x < C + R + 5; x++) {
                const [r, g, b, a] = rgba(s, x, y);
                expect(a, `${x},${y}`).toBe(255);
                expect(g, `${x},${y}`).toBe(r);
                expect(b, `${x},${y}`).toBeGreaterThanOrEqual(r);
            }
        }
    });

    test("keeps the magnification", () => {
        // red channel = x coordinate
        const s = lensOn(surface((x) => 0xff000000 | x));
        expect(rgba(s, C, C)[0]).toBe((C * 230) >> 8);
        // 10px right of the centre shows a pixel closer to the centre than 110
        expect(rgba(s, C + 10, C)[0]).toBeLessThan((110 * 230) >> 8);
    });
});
