/*
 * @file    voxel.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-voxel terrain maps and text strip
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Terrain, MAP_SIZE } from "../../files/effects/ts-voxel/src/terrain";
import { moveCamera, Camera, RELIEF } from "../../files/effects/ts-voxel/src/voxel";

//----- tests
describe("ts-voxel terrain", () => {
    const terrain = new Terrain(42);
    const last = MAP_SIZE - 1;

    test("height map tiles", () => {
        for (let i = 0; i < MAP_SIZE; i++) {
            // left / right border of row i
            expect(Math.abs(terrain.height[i * MAP_SIZE] - terrain.height[i * MAP_SIZE + last])).toBeLessThanOrEqual(8);
            // top / bottom border of column i
            expect(Math.abs(terrain.height[i] - terrain.height[last * MAP_SIZE + i])).toBeLessThanOrEqual(8);
        }
    });

    test("sample wraps negative and > 511 coordinates", () => {
        expect(terrain.heightAt(-1, 3)).toBe(terrain.heightAt(511, 3));
        expect(terrain.heightAt(515.5, 2)).toBeCloseTo(terrain.heightAt(3.5, 2), 9);
        expect(terrain.index(-1, -1)).toBe(last * MAP_SIZE + last);
        expect(terrain.index(512, 513)).toBe(1 * MAP_SIZE + 0);
    });

    test("colour depends on height", () => {
        let lo = 0;
        let hi = 0;
        for (let i = 0; i < terrain.height.length; i++) {
            if (terrain.height[i] < terrain.height[lo]) lo = i;
            if (terrain.height[i] > terrain.height[hi]) hi = i;
            expect(terrain.color[i] >>> 24).toBe(0xff);
        }
        expect(terrain.color[lo]).not.toBe(terrain.color[hi]);
    });

    test("strip painting wraps and restore returns the base map", () => {
        const t = new Terrain(42);
        const before = t.color.slice();
        const glyph = new Uint32Array(32 * 32).fill(0xffffffff);

        t.paintStrip([glyph], 32, 2, 510, 100, 0, 0xff90d8ff);

        let left = false;
        let right = false;
        for (let y = 100; y < 164; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                const i = y * MAP_SIZE + x;
                if (t.color[i] !== before[i]) {
                    if (x < 10) left = true;
                    if (x > 500) right = true;
                }
            }
        }
        expect(left).toBe(true);
        expect(right).toBe(true);

        t.restoreStrip();
        expect(t.color).toEqual(before);
    });

    test("glyphs can be stretched in depth", () => {
        const t = new Terrain(42);
        const before = t.color.slice();
        const glyph = new Uint32Array(32 * 32).fill(0xffffffff);

        // 1 texel wide, 4 texels deep per glyph pixel: 32 x 128 texels
        t.paintStrip([glyph], 32, 1, 100, 200, 0, 0xff90d8ff, 4);

        const changed = (x: number, y: number) => t.color[y * MAP_SIZE + x] !== before[y * MAP_SIZE + x];
        expect(changed(100, 200)).toBe(true);
        expect(changed(131, 327)).toBe(true);
        expect(changed(132, 200)).toBe(false);
        expect(changed(100, 328)).toBe(false);

        t.restoreStrip();
        expect(t.color).toEqual(before);
    });

    test("blank glyphs leave the map untouched", () => {
        const t = new Terrain(42);
        const before = t.color.slice();
        t.paintStrip([new Uint32Array(32 * 32)], 32, 2, 10, 10, 0, 0xff90d8ff);
        expect(t.color).toEqual(before);
    });
});

describe("ts-voxel camera", () => {
    test("camera stays above the terrain", () => {
        const terrain = new Terrain(0x5eed);
        const cam: Camera = { x: 0, y: 0, z: 0, angle: 0 };
        for (let frame = 0; frame <= 2000; frame++) {
            moveCamera(cam, terrain, frame);
            expect(Number.isFinite(cam.x)).toBe(true);
            expect(Number.isFinite(cam.y)).toBe(true);
            expect(cam.z).toBeGreaterThanOrEqual(RELIEF * terrain.heightAt(cam.x, cam.y) + 20);
        }
    });
});
