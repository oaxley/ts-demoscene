/*
 * @file    flag.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-flag building blocks (cloth simulation, wind, shading, projection, restart)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Noise } from "library/maths/noise";
import { TexVertex } from "library/gfx/texture";

import { Cloth, Wind } from "../../files/effects/ts-flag/src/cloth";
import {
    Flag,
    STILL_FRAMES,
    FALL_FRAMES,
    RAMP_FRAMES,
    CYCLE_FRAMES,
    DEPTH,
    NEAR,
    windAt,
    cellShade,
    isConvex,
    buildQuad,
} from "../../files/effects/ts-flag/src/flag";
import { runEffect } from "../harness/runner";

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

    test("stays inextensible when a gust hits the hanging flag", () => {
        const cloth = make();
        run(cloth, 100, 0.5, null);
        let max = 0;
        for (let i = 0; i < 200; i++) {
            cloth.step(0.5, { x: 6, y: 0, z: 2 });
            max = Math.max(max, cloth.maxStretch());
        }
        expect(max).toBeLessThan(0.08);
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

describe("flag effect", () => {
    const quad = (pts: number[][]): TexVertex[] => pts.map(([x, y]) => ({ x, y, z: 1, u: 0, v: 0 }));

    test("no wind while still and falling", () => {
        const noise = new Noise.Noise1D(1);
        for (const f of [0, STILL_FRAMES - 1, STILL_FRAMES + FALL_FRAMES - 1]) {
            expect(windAt(f, noise)).toEqual({ x: 0, y: 0, z: 0 });
        }
    });

    test("wind ramps up then gusts", () => {
        const noise = new Noise.Noise1D(1);
        const start = STILL_FRAMES + FALL_FRAMES;
        const third = windAt(start + Math.floor(RAMP_FRAMES / 3), noise).x;
        const end = windAt(start + RAMP_FRAMES - 1, noise).x;
        expect(end).toBeGreaterThan(third);

        const xs = new Set<number>();
        for (let f = start + RAMP_FRAMES; f < start + RAMP_FRAMES + 50; f++) {
            const w = windAt(f, noise);
            expect(w.x).toBeGreaterThan(0);
            xs.add(w.x);
        }
        expect(xs.size).toBeGreaterThanOrEqual(2);
        expect(windAt(start + 300, new Noise.Noise1D(7))).toEqual(windAt(start + 300, new Noise.Noise1D(7)));
    });

    test("both sides of a cell are lit", () => {
        // flat cloth (no ripple), then the same cloth turned over (y mirrored: the normal flips)
        const cloth = make();
        for (let i = 2; i < cloth.pos.length; i += 3) cloth.pos[i] = 0;
        const front = cellShade(cloth, 3, 3);
        expect(front).toBeGreaterThan(0.35);
        expect(front).toBeLessThanOrEqual(1);
        for (let i = 1; i < cloth.pos.length; i += 3) cloth.pos[i] = -cloth.pos[i];
        expect(cellShade(cloth, 3, 3)).toBeCloseTo(front, 9);
    });

    test("convex quads", () => {
        expect(
            isConvex(
                quad([
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                ]),
            ),
        ).toBe(true);
        expect(
            isConvex(
                quad([
                    [0, 0],
                    [10, 10],
                    [10, 0],
                    [0, 10],
                ]),
            ),
        ).toBe(false); // bow tie
        expect(
            isConvex(
                quad([
                    [0, 0],
                    [10, 0],
                    [2, 2],
                    [0, 10],
                ]),
            ),
        ).toBe(false); // dart
    });

    test("no point behind the near plane", () => {
        const cloth = make();
        for (let i = 2; i < cloth.pos.length; i += 3) cloth.pos[i] = -DEPTH * 2;
        const out: TexVertex[] = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 0, u: 0, v: 0 }));
        buildQuad(cloth, 5, 5, out, 320, 240);
        out.forEach((v) => {
            expect(v.z).toBeGreaterThanOrEqual(NEAR);
            expect(Number.isFinite(v.x) && Number.isFinite(v.y)).toBe(true);
        });
    });

    test("texture corners", () => {
        const cloth = make();
        const out: TexVertex[] = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 0, u: 0, v: 0 }));
        buildQuad(cloth, COLS - 2, ROWS - 2, out, 320, 240);
        expect(out[2].u).toBeCloseTo(256, 6);
        expect(out[2].v).toBeCloseTo(256, 6);
        buildQuad(cloth, 0, 0, out, 320, 240);
        expect([out[0].u, out[0].v]).toEqual([0, 0]);
    });

    test("restart is identical", async () => {
        // harness frame k = effect frame k-1 (the first run() only starts the throttle)
        const res = await runEffect(Flag, CYCLE_FRAMES + STILL_FRAMES + FALL_FRAMES + RAMP_FRAMES + 10, 1);
        const windy = STILL_FRAMES + FALL_FRAMES + RAMP_FRAMES + 5; // the cloth has been stepped
        for (const k of [1, 5, 19, windy]) {
            expect(res.checkpoints[String(CYCLE_FRAMES + k)]).toBe(res.checkpoints[String(k)]);
        }
        expect(res.checkpoints[String(windy)]).not.toBe(res.checkpoints["5"]);
    }, 120000);
});
