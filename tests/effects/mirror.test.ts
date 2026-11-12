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
import {
    floorColor,
    drawFloor,
    buildEnvMap,
    SKY_COLOR,
    TILE,
    HORIZON,
    FLOOR_Y,
} from "../../files/effects/ts-mirror/src/floor";

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

describe("ts-mirror floor", () => {
    test("checker alternates and has no double column at x = 0", () => {
        expect(floorColor(1, 400, 0)).not.toBe(floorColor(TILE + 1, 400, 0));
        expect(floorColor(-1, 400, 0)).not.toBe(floorColor(1, 400, 0));
        expect(floorColor(1, 400, 0)).toBe(floorColor(1, 400, 2 * TILE));
    });

    test("fog toward the sky", () => {
        expect(floorColor(0, 1e7, 0)).toBe(SKY_COLOR);
        expect(floorColor(0, Infinity, 0)).toBe(SKY_COLOR);
        expect(floorColor(0, 400, 0)).not.toBe(SKY_COLOR);
    });

    test("floor behind the camera stays a valid fogged colour", () => {
        // same fog as in front, and the checker still alternates
        const front = floorColor(1, 400, 0);
        const back = floorColor(1, -400, 0);
        const lum = (c: number) => (c & 0xff) + ((c >>> 8) & 0xff) + ((c >>> 16) & 0xff);
        expect([lum(back), lum(floorColor(TILE + 1, -400, 0))].sort()).toEqual(
            [lum(front), lum(floorColor(TILE + 1, 400, 0))].sort(),
        );
    });

    test("drawFloor fills the screen", () => {
        const dst = new Uint32Array(640 * 480);
        drawFloor(dst, 640, 480, 0);
        for (let i = 0; i < dst.length; i++) {
            if (dst[i] === 0 || dst[i] >>> 24 !== 0xff) {
                throw new Error(`bad pixel ${i}: ${dst[i].toString(16)}`);
            }
        }
        const row = (y: number) => dst.subarray(y * 640, (y + 1) * 640);
        expect(row(HORIZON).every((c) => c === SKY_COLOR)).toBe(true);
        expect(new Set(row(479)).size).toBeGreaterThan(1);
    });

    test("scroll moves the floor toward the viewer", () => {
        const bottom = (scroll: number) => {
            const dst = new Uint32Array(640 * 480);
            drawFloor(dst, 640, 480, scroll);
            return Array.from(dst.subarray(479 * 640));
        };
        expect(bottom(TILE)).not.toEqual(bottom(0));
        expect(bottom(2 * TILE)).toEqual(bottom(0));
    });

    test("env map: centre is floor under the torus, rim is sky", () => {
        const map = new Uint32Array(256 * 256);
        buildEnvMap(map, 0, 83, 500, 0);
        const d = v3(0, 0, 0);
        envDirection(128, 128, d);
        const t = (FLOOR_Y - 83) / d.y;
        expect(map[(128 << 8) | 128]).toBe(floorColor(d.x * t, 500 + d.z * t, 0));
        expect(map[0]).toBe(SKY_COLOR);
        expect(map[(2 << 8) | 128]).toBe(SKY_COLOR);
    });
});
