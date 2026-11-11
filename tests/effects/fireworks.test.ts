/*
 * @file    fireworks.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-fireworks particle pool, layout and effect
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Particles, Rng } from "../../files/effects/ts-fireworks/src/particles";

//----- tests
describe("ts-fireworks particles", () => {
    test("pool full: spawnRocket returns false, count stays at maxCount", () => {
        const p = new Particles(2, new Rng(1));
        expect(p.spawnRocket(0, 0, -1)).toBe(true);
        expect(p.spawnRocket(0, 0, -1)).toBe(true);
        expect(p.spawnRocket(0, 0, -1)).toBe(false);
        expect(p.count).toBe(2);
    });

    test("burst: spark count capped by remaining pool room", () => {
        const p = new Particles(10, new Rng(1));
        p.burst(0, 0, 50, 0);
        expect(p.count).toBe(10);
    });

    test("step: dead sparks are removed", () => {
        const p = new Particles(4, new Rng(1));
        p.burst(0, 0, 1, 0);
        p.life[0] = 0.01;
        p.step(0);
        expect(p.count).toBe(0);
    });

    test("same seed gives the same burst", () => {
        const a = new Particles(64, new Rng(7));
        const b = new Particles(64, new Rng(7));
        a.burst(10, 20, 30, 5);
        b.burst(10, 20, 30, 5);
        for (let i = 0; i < 3; i++) {
            a.step(0.1);
            b.step(0.1);
        }
        expect(Array.from(a.x.subarray(0, a.count))).toEqual(Array.from(b.x.subarray(0, b.count)));
        expect(Array.from(a.vy.subarray(0, a.count))).toEqual(Array.from(b.vy.subarray(0, b.count)));
    });

    test("rng returns values in [0, 1)", () => {
        const r = new Rng(3);
        for (let i = 0; i < 1000; i++) {
            const v = r.next();
            expect(v >= 0 && v < 1).toBe(true);
        }
    });
});
