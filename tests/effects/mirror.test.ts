/*
 * @file    mirror.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-mirror: torus mesh, reflection, sphere map, floor and environment map
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Point2D, Point3D } from "library/core/interfaces";
import { perspective } from "library/maths/projection";
import { isClockwise } from "library/maths/mesh";
import { torusMesh, reflect, sphereUV, envDirection } from "../../files/effects/ts-mirror/src/torus";

//----- helpers
const R = 60;
const r = 24;

function dot(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function len(a: Point3D): number {
    return Math.hypot(a.x, a.y, a.z);
}

function v3(x: number, y: number, z: number): Point3D {
    return { x, y, z };
}

//----- tests
describe("ts-mirror torus", () => {
    test("mesh sizes", () => {
        const mesh = torusMesh(R, r, 32, 16);
        expect(mesh.vertices.length).toBe(512);
        expect(mesh.normals.length).toBe(512);
        expect(mesh.quads.length).toBe(512);
        for (const q of mesh.quads) {
            expect(q.length).toBe(4);
            for (const i of q) {
                expect(i >= 0 && i < 512).toBe(true);
            }
        }
    });

    test("normals are unit and outward", () => {
        const mesh = torusMesh(R, r, 32, 16);
        mesh.vertices.forEach((p, k) => {
            const n = mesh.normals[k];
            const a = Math.atan2(p.z, p.x);
            const c = v3(R * Math.cos(a), 0, R * Math.sin(a));
            const pc = v3(p.x - c.x, p.y - c.y, p.z - c.z);
            expect(len(n)).toBeCloseTo(1, 9);
            expect(len(pc)).toBeCloseTo(r, 9);
            expect(dot(n, pc)).toBeGreaterThan(0);
        });
    });

    test("outward quads are clockwise", () => {
        const mesh = torusMesh(R, r, 32, 16);
        const world = mesh.vertices.map((p) => v3(p.x, p.y, p.z + 500));
        const screen = world.map((p) => {
            const o: Point2D = { x: 0, y: 0 };
            perspective(p.x, p.y, p.z, 600, 0, 320, 240, o);
            return o;
        });
        let checked = 0;
        for (const q of mesh.quads) {
            const c = v3(0, 0, 0);
            const n = v3(0, 0, 0);
            for (const i of q) {
                c.x += world[i].x / 4;
                c.y += world[i].y / 4;
                c.z += world[i].z / 4;
                n.x += mesh.normals[i].x / 4;
                n.y += mesh.normals[i].y / 4;
                n.z += mesh.normals[i].z / 4;
            }
            const facing = dot(n, c) / (len(n) * len(c));
            if (facing < -0.2) {
                expect(isClockwise(screen[q[0]], screen[q[1]], screen[q[2]])).toBe(true);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(50);
    });

    test("reflect", () => {
        const out = v3(0, 0, 0);
        reflect(v3(0, 0, 1), v3(0, 0, -1), out);
        expect(out.x).toBeCloseTo(0, 12);
        expect(out.y).toBeCloseTo(0, 12);
        expect(out.z).toBeCloseTo(-1, 12);

        reflect(v3(1, 0, 0), v3(0, 1, 0), out);
        expect(out).toEqual({ x: 1, y: 0, z: 0 });

        const s = Math.SQRT1_2;
        reflect(v3(s, s, 0), v3(0, -1, 0), out);
        expect(out.x).toBeCloseTo(s, 12);
        expect(out.y).toBeCloseTo(-s, 12);
        for (const [d, n] of [
            [v3(0.6, 0, 0.8), v3(0, 0.6, -0.8)],
            [v3(0, 0.28, 0.96), v3(0.8, -0.6, 0)],
        ]) {
            reflect(d, n, out);
            expect(len(out)).toBeCloseTo(1, 12);
        }
    });

    test("sphere map centre and horizon", () => {
        const uv: Point2D = { x: 0, y: 0 };
        sphereUV(v3(0, 1, 0), uv);
        expect(uv).toEqual({ x: 128, y: 128 });

        sphereUV(v3(1, 0, 0), uv);
        expect(Math.hypot(uv.x - 128, uv.y - 128)).toBeCloseTo(127 * Math.SQRT1_2, 9);

        sphereUV(v3(0, -1, 0), uv);
        expect(Number.isFinite(uv.x) && Number.isFinite(uv.y)).toBe(true);
        expect(uv.x >= 0 && uv.x <= 256 && uv.y >= 0 && uv.y <= 256).toBe(true);
    });

    test("sphere map round trip", () => {
        const d = v3(0, 0, 0);
        const uv: Point2D = { x: 0, y: 0 };
        let checked = 0;
        for (let v = 0; v < 256; v += 7) {
            for (let u = 0; u < 256; u += 7) {
                if (!envDirection(u, v, d)) continue;
                expect(len(d)).toBeCloseTo(1, 9);
                sphereUV(d, uv);
                expect(Math.abs(uv.x - (u + 0.5))).toBeLessThan(0.6);
                expect(Math.abs(uv.y - (v + 0.5))).toBeLessThan(0.6);
                checked++;
            }
        }
        expect(checked).toBeGreaterThan(900);
        expect(envDirection(0, 0, d)).toBe(false);
    });
});
