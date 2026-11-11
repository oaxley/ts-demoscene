/*
 * @file    flag.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-flag building blocks (cloth simulation, wind, shading, projection, restart)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Cloth, Wind } from "../../files/effects/ts-flag/src/cloth";

//----- helpers
const COLS = 32;
const ROWS = 16;

function make(): Cloth {
    return new Cloth(COLS, ROWS, 10, { x: -155, y: -75, z: 0 });
}

// mean of one coordinate (0 = x, 1 = y, 2 = z) over a column
function columnMean(cloth: Cloth, c: number, axis: number): number {
    let sum = 0;
    for (let r = 0; r < cloth.rows; r++) {
        sum += cloth.pos[(r * cloth.cols + c) * 3 + axis];
    }
    return sum / cloth.rows;
}

function run(cloth: Cloth, steps: number, gravity: number, wind: Wind | null): void {
    for (let i = 0; i < steps; i++) {
        cloth.step(gravity, wind);
    }
}

//----- tests
describe("cloth", () => {
    test("at rest without forces", () => {
        const cloth = make();
        const start = Array.from(cloth.pos);
        run(cloth, 50, 0, null);
        cloth.pos.forEach((v, i) => expect(v).toBeCloseTo(start[i], 9));
    });

    test("pinned column never moves", () => {
        const cloth = make();
        const start = Array.from(cloth.pos);
        run(cloth, 100, 0.5, { x: 2, y: 0, z: 1 });
        for (let r = 0; r < ROWS; r++) {
            const i = r * COLS * 3;
            expect([cloth.pos[i], cloth.pos[i + 1], cloth.pos[i + 2]]).toEqual([start[i], start[i + 1], start[i + 2]]);
        }
    });

    test("falls and hangs below the pole", () => {
        const cloth = make();
        run(cloth, 30, 0.5, null);
        const early = cloth.kineticEnergy();
        run(cloth, 270, 0.5, null);
        expect(columnMean(cloth, COLS - 1, 1)).toBeGreaterThan(columnMean(cloth, 0, 1) + 100);
        expect(cloth.maxStretch()).toBeLessThan(0.08);
        // the cloth keeps its length: the top edge, along the cloth, is as long as at rest
        let top = 0;
        for (let c = 0; c < COLS - 1; c++) {
            const i = c * 3;
            top += Math.hypot(
                cloth.pos[i + 3] - cloth.pos[i],
                cloth.pos[i + 4] - cloth.pos[i + 1],
                cloth.pos[i + 5] - cloth.pos[i + 2],
            );
        }
        expect(top).toBeLessThan((COLS - 1) * 10 * 1.03);
        expect(cloth.kineticEnergy()).toBeLessThan(early);
    });

    test("wind lifts the flag", () => {
        const still = make();
        const windy = make();
        run(still, 300, 0.5, null);
        run(windy, 300, 0.5, null);
        run(still, 200, 0.5, null);
        run(windy, 200, 0.5, { x: 2, y: 0, z: 0.5 });
        expect(columnMean(windy, COLS - 1, 0)).toBeGreaterThan(columnMean(still, COLS - 1, 0) + 50);
    });

    test("stays inextensible in gusts", () => {
        const cloth = make();
        run(cloth, 200, 0.5, { x: 6, y: 0, z: 2 });
        expect(cloth.maxStretch()).toBeLessThan(0.08);
    });

    test("never NaN", () => {
        const cloth = make();
        run(cloth, 50, 0, { x: 5, y: 0, z: 0 }); // wind in the plane of the flat cloth
        run(cloth, 50, 0.5, { x: 0, y: 0, z: 5 });
        cloth.pos.forEach((v) => expect(Number.isFinite(v)).toBe(true));
    });

    test("deterministic", () => {
        const a = make();
        const b = make();
        run(a, 200, 0.5, { x: 3, y: 0, z: 1 });
        run(b, 200, 0.5, { x: 3, y: 0, z: 1 });
        expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
    });

    test("reset", () => {
        const cloth = make();
        run(cloth, 100, 0.5, { x: 3, y: 0, z: 1 });
        cloth.reset();
        expect(Array.from(cloth.pos)).toEqual(Array.from(make().pos));
        expect(cloth.kineticEnergy()).toBe(0);
    });
});
