/*
 * @file    cube.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-cube building blocks (geometry, rotation, back-face culling, face shading)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Point2D, Point3D } from "library/core/interfaces";
import {
    CUBE_SIZE,
    VERTICES,
    FACES,
    FACE_UV,
    rotate,
    isVisible,
    faceShade,
    cubePath,
    PATH_X,
    PATH_Y,
    ZOOM,
    DEPTH,
} from "../../files/effects/ts-cube/src/cube";

//----- helpers
const DISTANCE = 400; // cube centre distance to the camera
const FOCAL = 256;

// perspective projection (screen centre 320x240, y down)
function project(p: Point3D): Point2D {
    const k = FOCAL / (p.z + DISTANCE);
    return { x: 320 + p.x * k, y: 240 + p.y * k };
}

// rotate the cube by the angles (radians) and project it
function transform(ax: number, ay: number, az: number): { world: Point3D[]; screen: Point2D[] } {
    const world = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
    rotate(VERTICES, Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az), world);
    return { world, screen: world.map(project) };
}

function visible(screen: Point2D[], face: number[]): boolean {
    return isVisible(screen[face[0]], screen[face[1]], screen[face[2]]);
}

function sub(a: Point3D, b: Point3D): Point3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Point3D, b: Point3D): Point3D {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

// centre of a face
function centre(p: Point3D[], face: number[]): Point3D {
    const c = { x: 0, y: 0, z: 0 };
    for (const i of face) {
        c.x += p[i].x / 4;
        c.y += p[i].y / 4;
        c.z += p[i].z / 4;
    }
    return c;
}

// pseudo-random angle triples (deterministic)
function angles(n: number): number[][] {
    const out: number[][] = [];
    let seed = 12345;
    const rnd = (): number => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return (seed / 2147483648) * 2 * Math.PI;
    };
    for (let i = 0; i < n; i++) {
        out.push([rnd(), rnd(), rnd()]);
    }
    return out;
}

//----- tests
describe("ts-cube", () => {
    test("geometry: 8 corners at ±CUBE_SIZE, 6 faces of 4 vertices, opposite pairs (0,1), (2,3), (4,5)", () => {
        expect(VERTICES).toHaveLength(8);
        for (const v of VERTICES) {
            expect([Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)]).toEqual([CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]);
        }
        expect(FACES).toHaveLength(6);

        for (let f = 0; f < 6; f += 2) {
            const a = centre(VERTICES, FACES[f]);
            const b = centre(VERTICES, FACES[f + 1]);
            // opposite faces: centres symmetric through the cube centre, on one axis
            expect([a.x + b.x, a.y + b.y, a.z + b.z]).toEqual([0, 0, 0]);
            expect(Math.hypot(a.x, a.y, a.z)).toBe(CUBE_SIZE);
        }
        // front (toward the camera), back, left, right, top, bottom
        expect(centre(VERTICES, FACES[0]).z).toBe(-CUBE_SIZE);
        expect(centre(VERTICES, FACES[2]).x).toBe(-CUBE_SIZE);
        expect(centre(VERTICES, FACES[4]).y).toBe(-CUBE_SIZE);

        expect(FACE_UV).toEqual([
            { x: 0, y: 0 },
            { x: 256, y: 0 },
            { x: 256, y: 256 },
            { x: 0, y: 256 },
        ]);
    });

    test("faces are not mirrored: image right x image down points inward for every face", () => {
        for (const face of FACES) {
            const p = face.map((i) => VERTICES[i]);
            const right = sub(p[1], p[0]);
            const down = sub(p[3], p[0]);
            // the 4 vertices form a square (top-left, top-right, bottom-right, bottom-left)
            expect(sub(p[2], p[1])).toEqual(down);
            const inward = cross(right, down);
            const c = centre(VERTICES, face);
            expect(inward.x * c.x + inward.y * c.y + inward.z * c.z).toBeLessThan(0);
        }
    });

    test("the front face at identity: vertex 0 is top-left, vertex 1 is on its right", () => {
        const { screen } = transform(0, 0, 0);
        const p = FACES[0].map((i) => screen[i]);
        const minX = Math.min(...p.map((q) => q.x));
        const minY = Math.min(...p.map((q) => q.y));
        expect(p[0]).toEqual({ x: minX, y: minY });
        expect(p[1].x).toBeGreaterThan(p[0].x);
        expect(p[1].y).toBe(p[0].y);
        expect(p[3].y).toBeGreaterThan(p[0].y);
    });

    test("the front face is visible without rotation", () => {
        const { screen } = transform(0, 0, 0);
        expect(FACES[0].every((i) => VERTICES[i].z === -CUBE_SIZE)).toBe(true);
        expect(visible(screen, FACES[0])).toBe(true);
        expect(visible(screen, FACES[1])).toBe(false);
        // the camera is in front of the cube: side faces are hidden
        for (let f = 2; f < 6; f++) {
            expect(visible(screen, FACES[f])).toBe(false);
        }
    });

    test("exactly one of each pair of opposite faces is visible (unless the camera is between their planes)", () => {
        const camera = { x: 0, y: 0, z: -DISTANCE };
        for (const [ax, ay, az] of angles(50)) {
            const { world, screen } = transform(ax, ay, az);

            for (let f = 0; f < 6; f += 2) {
                const a = visible(screen, FACES[f]);
                const b = visible(screen, FACES[f + 1]);
                expect(a && b).toBe(false);

                // signed distance of the camera to the plane of face f (outward normal)
                const c = centre(world, FACES[f]);
                const d = (c.x * (camera.x - c.x) + c.y * (camera.y - c.y) + c.z * (camera.z - c.z)) / CUBE_SIZE;
                const e = 1e-6;
                if (d > e) {
                    expect(a).toBe(true); // camera in front of face f
                } else if (d < -2 * CUBE_SIZE - e) {
                    expect(b).toBe(true); // camera in front of the opposite face
                } else if (d < -e && d > -2 * CUBE_SIZE + e) {
                    expect(a || b).toBe(false); // camera between the two planes: both edge-on or back
                }
            }
        }
    });

    test("1 to 3 faces are visible over a full rotation", () => {
        for (let a = 0; a < 360; a += 7) {
            const r = (a * Math.PI) / 180;
            const { screen } = transform(r, r, r);
            const count = FACES.filter((face) => visible(screen, face)).length;
            expect(count).toBeGreaterThanOrEqual(1);
            expect(count).toBeLessThanOrEqual(3);
        }
    });

    test("zero-area faces are not visible", () => {
        expect(isVisible({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe(false);
        expect(isVisible({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 })).toBe(false);
    });

    test("rotate keeps distances", () => {
        for (const [ax, ay, az] of angles(50)) {
            const { world } = transform(ax, ay, az);
            for (const p of world) {
                expect(Math.abs(Math.hypot(p.x, p.y, p.z) - CUBE_SIZE * Math.sqrt(3))).toBeLessThan(1e-9);
            }
        }
    });

    test("rotate applies X, then Y, then Z, in place in out", () => {
        const out = [{ x: 0, y: 0, z: 0 }];
        const half = Math.PI / 2;
        // X by 90°: (0, 1, 0) -> (0, 0, 1); then Y by 90°: (0, 0, 1) -> (1, 0, 0)
        rotate([{ x: 0, y: 1, z: 0 }], Math.cos(half), Math.sin(half), Math.cos(half), Math.sin(half), 1, 0, out);
        expect(out[0].x).toBeCloseTo(1, 12);
        expect(out[0].y).toBeCloseTo(0, 12);
        expect(out[0].z).toBeCloseTo(0, 12);

        // identity keeps the vertices, and writes into the given objects
        const target = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
        const first = target[0];
        rotate(VERTICES, 1, 0, 1, 0, 1, 0, target);
        expect(target).toEqual(VERTICES);
        expect(target[0]).toBe(first);
    });

    test("faceShade is in [0.4, 1], the front face is lit at identity", () => {
        for (const [ax, ay, az] of angles(100)) {
            const { world } = transform(ax, ay, az);
            for (const face of FACES) {
                const s = faceShade(world, face);
                expect(s).toBeGreaterThanOrEqual(0.4);
                expect(s).toBeLessThanOrEqual(1);
            }
        }

        // light from the top-left-front: front, left and top faces are lit, the others are not
        const { world } = transform(0, 0, 0);
        expect(faceShade(world, FACES[0])).toBeGreaterThan(0.4);
        expect(faceShade(world, FACES[2])).toBeGreaterThan(0.4);
        expect(faceShade(world, FACES[4])).toBeGreaterThan(0.4);
        expect(faceShade(world, FACES[1])).toBe(0.4);
        expect(faceShade(world, FACES[3])).toBe(0.4);
        expect(faceShade(world, FACES[5])).toBe(0.4);
    });

    test("cubePath stays within its range and moves smoothly", () => {
        let minX = 0;
        let maxX = 0;
        let prev = cubePath(0);
        for (let f = 1; f < 20000; f++) {
            const p = cubePath(f);
            expect(Math.abs(p.x)).toBeLessThanOrEqual(PATH_X);
            expect(Math.abs(p.y)).toBeLessThanOrEqual(PATH_Y);
            // no jump: less than 3 units (about 3.6 px) between two frames
            expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(3);
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            prev = p;
        }
        // it really wanders across the screen
        expect(maxX - minX).toBeGreaterThan(PATH_X);
    });

    test("the moving, rotating cube always stays fully on screen", () => {
        const out: Point3D[] = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
        for (let f = 0; f < 20000; f += 3) {
            const a = ((f * 1) % 360) * (Math.PI / 180);
            const b = ((f * 2) % 360) * (Math.PI / 180);
            const c = ((f * 3) % 360) * (Math.PI / 180);
            rotate(VERTICES, Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c), out);
            const o = cubePath(f);
            for (const p of out) {
                const k = ZOOM / (p.z + DEPTH);
                const sx = 320 + (p.x + o.x) * k;
                const sy = 240 + (p.y + o.y) * k;
                expect(sx).toBeGreaterThanOrEqual(0);
                expect(sx).toBeLessThan(640);
                expect(sy).toBeGreaterThanOrEqual(0);
                expect(sy).toBeLessThan(480);
            }
        }
    });
});
