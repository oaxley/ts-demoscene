/*
 * @file    tunnel.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-tunnel: ray / tube geometry, seamless texture, depth and camera motion
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Surface } from "library/gfx/surface";
import { Display } from "library/core/display";
import { FakeCanvas } from "../harness/dom";
import { runEffect, WIDTH, HEIGHT } from "../harness/runner";
import { Tunnel, castRay, wrapDelta, seamlessTexture, TEX_SIZE } from "../../files/effects/ts-tunnel/src/tunnel";

//----- helpers
// brightness (r + g + b) of a pixel of the canvas
function luma(data: Uint8ClampedArray, x: number, y: number): number {
    const i = (y * WIDTH + x) * 4;
    return data[i] + data[i + 1] + data[i + 2];
}

// darkest 8x8 block of a frame (centre of the block): the end of the tunnel
function darkest(data: Uint8ClampedArray): { x: number; y: number } {
    let best = Infinity;
    let at = { x: 0, y: 0 };
    for (let by = 0; by < HEIGHT; by += 8) {
        for (let bx = 0; bx < WIDTH; bx += 8) {
            let sum = 0;
            for (let y = by; y < by + 8; y++) {
                for (let x = bx; x < bx + 8; x++) {
                    sum += luma(data, x, y);
                }
            }
            if (sum < best) {
                best = sum;
                at = { x: bx + 4, y: by + 4 };
            }
        }
    }
    return at;
}

//----- tests
describe("ts-tunnel geometry", () => {
    test("castRay: distance to the wall of a unit tube", () => {
        // from the axis, any sideways direction hits at distance 1 (per unit of direction)
        expect(castRay(0, 0, 1, 0)).toBeCloseTo(1);
        expect(castRay(0, 0, 0, -2)).toBeCloseTo(0.5);

        // off-axis camera: the near wall is closer, the far wall further away
        expect(castRay(0.5, 0, 1, 0)).toBeCloseTo(0.5);
        expect(castRay(0.5, 0, -1, 0)).toBeCloseTo(1.5);

        // along the axis: never hits
        expect(castRay(0, 0, 0, 0)).toBe(Infinity);
    });

    test("wrapDelta: shortest signed difference on the texture", () => {
        expect(wrapDelta(10)).toBe(10);
        expect(wrapDelta(TEX_SIZE - 2)).toBe(-2);
        expect(wrapDelta(-TEX_SIZE + 3)).toBe(3);
        expect(wrapDelta(2 * TEX_SIZE + 5)).toBe(5);
    });

    test("seamlessTexture: mirrored tiles, no seam when wrapping", () => {
        const src = new Surface({ width: 30, height: 20 });
        for (let i = 0; i < src.data32.length; i++) {
            src.data32[i] = (0xff000000 | (i * 2654435761)) >>> 0;
        }
        const tex = seamlessTexture(src);
        expect(tex).toHaveLength(TEX_SIZE * TEX_SIZE);

        const at = (u: number, v: number) => tex[v * TEX_SIZE + u];
        const L = TEX_SIZE - 1;
        for (const [u, v] of [
            [0, 0],
            [17, 3],
            [100, 200],
        ]) {
            expect(at(u, v)).toBe(at(L - u, v)); // left / right mirror
            expect(at(u, v)).toBe(at(u, L - v)); // top / bottom mirror
        }
        // first and last column / row are the same texel: wrapping is continuous
        expect(at(0, 5)).toBe(at(L, 5));
        expect(at(5, 0)).toBe(at(5, L));
    });
});

describe("ts-tunnel rendering", () => {
    // render the effect at a given time (ms)
    async function frame(ms: number): Promise<Uint8ClampedArray> {
        const canvas = new FakeCanvas(WIDTH, HEIGHT);
        const display = new Display(canvas as unknown as HTMLCanvasElement);
        const t = new Tunnel(display);
        t.setup();
        for (let i = 0; i < 200 && !t.isAnimated; i++) {
            await new Promise((r) => setTimeout(r, 0));
        }
        t.run(ms);
        return canvas.getContext("2d").getImageData(0, 0, WIDTH, HEIGHT).data;
    }

    test("almost dark at the end, darker walls in the distance, bright near walls", async () => {
        const data = await frame(0);
        const end = darkest(data);
        const l = luma(data, end.x, end.y);
        expect(l).toBeGreaterThan(0); // a faint glow, not pure black
        expect(l).toBeLessThan(90); // r + g + b

        // ring between the light and the edges: fog, darker than the near walls on the edges
        const ring = (r: number) => {
            let sum = 0;
            for (let k = 0; k < 64; k++) {
                const a = (k / 64) * 2 * Math.PI;
                const x = Math.round(end.x + r * Math.cos(a));
                const y = Math.round(end.y + r * Math.sin(a));
                if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
                    sum += luma(data, x, y);
                }
            }
            return sum;
        };
        expect(ring(70)).toBeLessThan(ring(220));
    });

    test("the camera steers: the end of the tunnel moves on both axes", async () => {
        const points = [];
        for (const ms of [0, 1500, 3000, 4500, 6000, 7500]) {
            points.push(darkest(await frame(ms)));
        }
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(40);
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(30);
    });

    test("deterministic", async () => {
        const a = await runEffect(Tunnel, 3, 1);
        const b = await runEffect(Tunnel, 3, 1);
        expect(a).toEqual(b);
    });
});
