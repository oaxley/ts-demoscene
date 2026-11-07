/*
 * @file    starfield.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-starfield projection and rotation
 */

//----- imports
import { describe, test, expect } from "vitest";

import { project, ROTATION_STEP } from "../../files/effects/ts-starfield/src/starfield";

//----- tests
describe("ts-starfield rotation", () => {
    test("rotates by 15 degrees every 100 frames", () => {
        expect(ROTATION_STEP * 100).toBeCloseTo((15 * Math.PI) / 180, 12);
    });

    test("no rotation: same projection as before", () => {
        // x * 256 / (z + 384) with z = 128 -> x / 2
        expect(project(100, -60, 128, 0, 320, 240)).toEqual({ x: 370, y: 210 });
    });

    test("rotates clockwise on screen (y goes down)", () => {
        // within 1px: cos(PI/2) is not exactly 0 and the projection floors
        const near = (p: { x: number; y: number }, x: number, y: number) => {
            expect(Math.abs(p.x - x), `x=${p.x}`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y - y), `y=${p.y}`).toBeLessThanOrEqual(1);
        };

        // a star on the right of the centre goes below it after a quarter turn
        near(project(100, 0, 128, Math.PI / 2, 320, 240), 320, 290);

        // a star above the centre goes to the right
        near(project(0, -100, 128, Math.PI / 2, 320, 240), 370, 240);

        // and a small step moves a star on the right slightly down
        expect(project(100, 0, 128, 0.1, 320, 240).y).toBeGreaterThan(240);
    });
});
