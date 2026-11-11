/*
 * @file    fireworks.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-fireworks particle pool, layout and effect
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Particles, Rng } from "../../files/effects/ts-fireworks/src/particles";
import { layout } from "../../files/effects/ts-fireworks/src/layout";

//----- tests
describe("ts-fireworks layout", () => {
    test("small sprite: drawn at native size, centred in the left half", () => {
        const l = layout(640, 480, 100, 80);
        expect(l.spriteW).toBe(100);
        expect(l.spriteH).toBe(80);
        expect(l.spriteX).toBe(110);
        expect(l.spriteY).toBe(200);
        expect(l.bandWidth).toBe(140);
    });

    test("sprite wider than the left half: scaled to fit, aspect kept", () => {
        const l = layout(640, 480, 800, 400);
        expect(l.spriteW).toBeLessThanOrEqual(320 - 40);
        expect(l.spriteW / l.spriteH).toBeCloseTo(2, 6);
    });

    test("sprite taller than the screen: scaled to the height", () => {
        const l = layout(640, 480, 100, 960);
        expect(l.spriteH).toBe(480);
    });
});

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

describe("ts-fireworks effect", () => {
    test("registered in the effect list", async () => {
        const { EFFECTS } = await import("../effects");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");
        expect(EFFECTS["ts-fireworks"]).toBe(Fireworks);
    });

    test("band: white from x=0 to bandWidth-1, not white right after", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        // no sprite file in the test: the band is laid out from a 0x0 sprite
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
            layout_: { bandWidth: number };
        };
        fx.toggle();
        fx.run(0);
        fx.run(50);

        const band = fx.layout_.bandWidth;
        const px = (x: number, y: number) => display.surface.getPixel(x, y).uint32 & 0xffffff;
        expect(px(0, 0)).toBe(0xffffff);
        expect(px(band - 1, 239)).toBe(0xffffff);
        expect(px(band, 239)).not.toBe(0xffffff);
    });

    test("no particle over the band after 200 frames", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
            layout_: { bandWidth: number };
            particles_: { count: number };
        };
        fx.toggle();
        let peak = 0;
        for (let i = 0; i < 200; i++) {
            fx.run(i * 50);
            peak = Math.max(peak, fx.particles_.count);
        }
        expect(peak).toBeGreaterThan(0);
        // the whole left half is either the band or the (empty) sprite area
        const band = fx.layout_.bandWidth;
        let stray = 0;
        for (let x = band; x < 320; x++) {
            for (let y = 0; y < 480; y++) {
                if ((display.surface.getPixel(x, y).uint32 & 0xffffff) !== 0) {
                    stray++;
                }
            }
        }
        expect(stray).toBe(0);
    });
});
