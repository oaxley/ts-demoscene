/*
 * @file    mesh.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Unit tests for the shared meshes, flat shading and texture checks
 */

//----- imports
import { describe, test, expect } from "vitest";

import { cubeVertices, CUBE_FACES, isClockwise, lambert, LIGHT_TOP_LEFT } from "library/maths/mesh";
import { isTextureReady } from "library/gfx/texture";
import { Surface } from "library/gfx/surface";

//----- tests
describe("cube mesh", () => {
    test("8 corners, front face first", () => {
        const v = cubeVertices(1);
        expect(v).toHaveLength(8);
        expect(v[0]).toEqual({ x: -1, y: -1, z: -1 });
        expect(v[6]).toEqual({ x: 1, y: 1, z: 1 });
        for (const p of v) {
            expect([Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)]).toEqual([1, 1, 1]);
        }
    });

    test("6 faces of 4 distinct corners, front face at z = -S", () => {
        const v = cubeVertices(2);
        expect(CUBE_FACES).toHaveLength(6);
        for (const f of CUBE_FACES) {
            expect(new Set(f).size).toBe(4);
        }
        expect(CUBE_FACES[0].every((i) => v[i].z === -2)).toBe(true);
    });

    test("isClockwise (y down), collinear is not", () => {
        expect(isClockwise({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 })).toBe(true);
        expect(isClockwise({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 })).toBe(false);
        expect(isClockwise({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe(false);
    });
});

describe("lambert", () => {
    test("one-sided and two-sided", () => {
        const lit = 0.4 + 0.6 * (2 / Math.sqrt(6));
        expect(lambert(0, 0, -1, LIGHT_TOP_LEFT, 0.4, 0.6, false)).toBeCloseTo(lit);
        expect(lambert(0, 0, 1, LIGHT_TOP_LEFT, 0.4, 0.6, false)).toBe(0.4);
        expect(lambert(0, 0, 1, LIGHT_TOP_LEFT, 0.4, 0.6, true)).toBeCloseTo(lit);
        expect(lambert(0, 0, -5, LIGHT_TOP_LEFT, 0.9, 0.6, false)).toBe(1);
    });
});

describe("texture", () => {
    test("isTextureReady only for 256x256", () => {
        expect(isTextureReady(new Surface())).toBe(false);
        expect(isTextureReady(new Surface({ width: 256, height: 256 }))).toBe(true);
        expect(isTextureReady(new Surface({ width: 255, height: 256 }))).toBe(false);
    });
});
