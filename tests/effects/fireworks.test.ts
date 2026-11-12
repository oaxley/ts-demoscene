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
    test("sprite is 90% of the screen height, pinned to the bottom-left", () => {
        const l = layout(480, 200, 400);
        expect(l.spriteH).toBe(432);
        expect(l.spriteW).toBe(216);
        expect(l.spriteX).toBe(0);
        expect(l.spriteY).toBe(480 - 432);
    });

    test("wide sprite: height wins, it may run past the left half, aspect kept", () => {
        const l = layout(480, 640, 400);
        expect(l.spriteH).toBe(432);
        expect(l.spriteW).toBe(691);
        expect(l.spriteY).toBe(480 - 432);
    });

    test("small sprite: enlarged to 90% of the height too", () => {
        const l = layout(480, 100, 80);
        expect(l.spriteH).toBe(432);
        expect(l.spriteW).toBe(540);
        expect(l.spriteY).toBe(480 - 432);
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

    test("five rockets in flight at the same time", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
            particles_: { count: number; kind: Uint8Array };
        };
        fx.toggle();
        let peak = 0;
        for (let i = 0; i < 200; i++) {
            fx.run(i * 50);
            let rockets = 0;
            for (let k = 0; k < fx.particles_.count; k++) {
                if (fx.particles_.kind[k] === 0) {
                    rockets++;
                }
            }
            peak = Math.max(peak, rockets);
        }
        expect(peak).toBeGreaterThanOrEqual(5);
    });

    test("background: black on the whole screen before the sprite is drawn", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
        };
        fx.toggle();
        fx.run(0);
        fx.run(50);

        const px = (x: number, y: number) => display.surface.getPixel(x, y).uint32 & 0xffffff;
        expect(px(0, 0)).toBe(0);
        expect(px(639, 479)).toBe(0);
    });

    test("a spark on the left half, outside the sprite, is drawn", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
            particles_: {
                burst: (x: number, y: number, n: number, c: number) => void;
                vx: Float32Array;
                vy: Float32Array;
            };
        };
        fx.toggle();
        fx.run(0);
        fx.particles_.burst(100, 20, 1, 0xffffff);
        fx.particles_.vx[0] = 0;
        fx.particles_.vy[0] = 0;
        fx.run(50);

        expect(display.surface.getPixel(100, 20).uint32 & 0xffffff).not.toBe(0);
    });

    test("a spark shows through the transparent part of the sprite", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            setup: () => void;
            run: (t: number) => void;
            toggle: () => void;
            isAnimated: boolean;
            layout_: { spriteX: number; spriteY: number; spriteW: number; spriteH: number };
            sprite_: { width: number; data32: Uint32Array };
            particles_: {
                burst: (x: number, y: number, n: number, c: number) => void;
                vx: Float32Array;
                vy: Float32Array;
            };
        };
        fx.setup();
        for (let i = 0; i < 200 && !fx.isAnimated; i++) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // find a fully transparent sprite pixel and put a spark on it
        const l = fx.layout_;
        let hole: { x: number; y: number } | undefined;
        for (let y = 0; y < l.spriteH && !hole; y++) {
            for (let x = 0; x < l.spriteW && !hole; x++) {
                if ((fx.sprite_.data32[y * fx.sprite_.width + x] & 0xff000000) === 0) {
                    hole = { x: l.spriteX + x, y: l.spriteY + y };
                }
            }
        }
        expect(hole).toBeDefined();

        fx.run(0);
        fx.particles_.burst(hole!.x, hole!.y, 1, 0xffffff);
        fx.particles_.vx[0] = 0;
        fx.particles_.vy[0] = 0;
        fx.run(50);

        expect(display.surface.getPixel(hole!.x, hole!.y).uint32 & 0xffffff).not.toBe(0);
    });

    test("particles spawn on the right half after 200 frames", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            run: (t: number) => void;
            toggle: () => void;
            particles_: { count: number; x: Float32Array };
        };
        fx.toggle();
        let peak = 0;
        for (let i = 0; i < 200; i++) {
            fx.run(i * 50);
            peak = Math.max(peak, fx.particles_.count);
        }
        expect(peak).toBeGreaterThan(0);

        // nothing is drawn on the left half outside the sprite's box: no fireworks there
        const l = (fx as unknown as { layout_: { spriteX: number; spriteY: number; spriteW: number; spriteH: number } })
            .layout_;
        let stray = 0;
        for (let x = 0; x < 320; x++) {
            for (let y = 0; y < 480; y++) {
                const inSprite =
                    x >= l.spriteX && x < l.spriteX + l.spriteW && y >= l.spriteY && y < l.spriteY + l.spriteH;
                if (!inSprite && (display.surface.getPixel(x, y).uint32 & 0xffffff) !== 0) {
                    stray++;
                }
            }
        }
        expect(stray).toBe(0);
    });
});

describe("ts-fireworks sprite", () => {
    test("real sprite is pinned bottom-left, inside the left half", async () => {
        const { FakeCanvas } = await import("../harness/dom");
        const { Display } = await import("library/core/display");
        const { Fireworks } = await import("../../files/effects/ts-fireworks/src/fireworks");

        const canvas = new FakeCanvas(640, 480);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const fx = new Fireworks(display) as unknown as {
            setup: () => void;
            run: (t: number) => void;
            layout_: { spriteX: number; spriteY: number; spriteW: number; spriteH: number };
            isAnimated: boolean;
        };
        fx.setup();
        for (let i = 0; i < 200 && !fx.isAnimated; i++) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        expect(fx.layout_.spriteW).toBeGreaterThan(0);

        // the drawn sprite is exactly the laid-out size, so it cannot spill
        const drawn = (fx as unknown as { sprite_: { width: number; height: number } }).sprite_;
        expect(drawn.width).toBe(fx.layout_.spriteW);
        expect(drawn.height).toBe(fx.layout_.spriteH);

        for (let i = 0; i < 5; i++) {
            fx.run(1000 + i * 50);
        }

        // the sprite is 90% of the height and pinned to the bottom-left corner
        expect(fx.layout_.spriteH).toBe(432);
        expect(fx.layout_.spriteX).toBe(0);
        expect(fx.layout_.spriteY + fx.layout_.spriteH).toBe(480);
    });
});
