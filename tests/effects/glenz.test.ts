/*
 * @file    glenz.test.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   ts-glenz building blocks (cube geometry, face grids, back/front split, checker)
 */

//----- imports
import { describe, test, expect } from "vitest";

import { Point2D, Point3D } from "library/core/interfaces";
import { rotate } from "library/maths/projection";

import {
    CUBE_SIZE,
    ZOOM,
    DEPTH,
    GRID,
    VERTICES,
    FACES,
    BLUE,
    WHITE,
    isFront,
    cellColor,
    faceGrid,
    Glenz,
} from "../../files/effects/ts-glenz/src/glenz";
import { runEffect } from "../harness/runner";

//----- helpers
const N = GRID + 1; // grid points per face edge

function sub(a: Point3D, b: Point3D): Point3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Point3D, b: Point3D): Point3D {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

// rotate the cube by the angles (radians)
function rotated(ax: number, ay: number, az: number): Point3D[] {
    const out = VERTICES.map(() => ({ x: 0, y: 0, z: 0 }));
    rotate(VERTICES, Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az), out);
    return out;
}

// perspective projection (screen centre 320x240)
function project(p: Point3D): Point2D {
    const k = ZOOM / (p.z + DEPTH);
    return { x: 320 + p.x * k, y: 240 + p.y * k };
}

// the grid of a face
function grid(p: Point3D[], face: number[]): Point3D[] {
    const out = Array.from({ length: N * N }, () => ({ x: 0, y: 0, z: 0 }));
    faceGrid(p, face, out);
    return out;
}

// the N grid points of a face along its edge from vertex va to vertex vb (in that order)
function edgePoints(face: number[], g: Point3D[], va: number, vb: number): Point3D[] {
    // the 4 sides: (corner, corner, grid index of step k)
    const sides: [number, number, (k: number) => number][] = [
        [face[0], face[1], (k) => k], // top    (j = 0)
        [face[1], face[2], (k) => k * N + GRID], // right  (i = GRID)
        [face[3], face[2], (k) => GRID * N + k], // bottom (j = GRID)
        [face[0], face[3], (k) => k * N], // left   (i = 0)
    ];
    for (const [a, b, at] of sides) {
        const pts = Array.from({ length: N }, (_, k) => g[at(k)]);
        if (a === va && b === vb) return pts;
        if (a === vb && b === va) return pts.reverse();
    }
    throw new Error("edge not in face");
}

//----- tests
describe("ts-glenz cube", () => {
    test("face winding: right x down points inward", () => {
        for (const face of FACES) {
            const [a, b, , d] = face.map((i) => VERTICES[i]);
            const n = cross(sub(b, a), sub(d, a));
            const c = face.reduce(
                (s, i) => ({ x: s.x + VERTICES[i].x, y: s.y + VERTICES[i].y, z: s.z + VERTICES[i].z }),
                {
                    x: 0,
                    y: 0,
                    z: 0,
                },
            );
            expect(dot(n, c)).toBeLessThan(0);
        }
        for (let v = 0; v < 8; v++) {
            expect(FACES.filter((f) => f.includes(v)).length).toBe(3);
        }
        expect(Math.hypot(VERTICES[0].x, VERTICES[0].y, VERTICES[0].z)).toBeCloseTo(CUBE_SIZE * Math.sqrt(3), 9);
        expect(DEPTH).toBeGreaterThan(CUBE_SIZE * Math.sqrt(3));
    });

    test("cells tile the face", () => {
        for (let k = 0; k < 10; k++) {
            const p = rotated(k * 0.37 + 0.1, k * 0.71 + 0.2, k * 1.13 + 0.3);
            const grids = FACES.map((face) => grid(p, face));

            FACES.forEach((face, f) => {
                const g = grids[f];
                expect(g[0]).toEqual(p[face[0]]);
                expect(g[GRID]).toEqual(p[face[1]]);
                expect(g[GRID * N + GRID]).toEqual(p[face[2]]);
                expect(g[GRID * N]).toEqual(p[face[3]]);

                // every point in the face plane
                const a = p[face[0]];
                const n = cross(sub(p[face[1]], a), sub(p[face[3]], a));
                const len = Math.hypot(n.x, n.y, n.z);
                for (const q of g) {
                    expect(Math.abs(dot(n, sub(q, a)) / len)).toBeLessThan(1e-9);
                }
            });

            // faces sharing an edge: bitwise identical points along it, so identical projections
            let shared = 0;
            for (let f1 = 0; f1 < 6; f1++) {
                for (let f2 = f1 + 1; f2 < 6; f2++) {
                    const common = FACES[f1].filter((v) => FACES[f2].includes(v));
                    if (common.length !== 2) continue;
                    shared++;
                    const [va, vb] = common;
                    const e1 = edgePoints(FACES[f1], grids[f1], va, vb);
                    const e2 = edgePoints(FACES[f2], grids[f2], va, vb);
                    expect(e1).toEqual(e2);
                    expect(e1.map(project)).toEqual(e2.map(project));
                }
            }
            expect(shared).toBe(12);
        }
    });

    test("back/front split", () => {
        for (let k = 0; k < 50; k++) {
            const s = rotated(k * 0.37, k * 0.71, k * 1.13).map(project);
            const front = FACES.map((f) => isFront(s[f[0]], s[f[1]], s[f[2]]));
            const count = front.filter((x) => x).length;
            expect(count).toBeGreaterThanOrEqual(1);
            expect(count).toBeLessThanOrEqual(3);
            for (const [a, b] of [
                [0, 1],
                [2, 3],
                [4, 5],
            ]) {
                expect(front[a] && front[b]).toBe(false);
            }
        }
    });

    test("edge-on face is back only", () => {
        expect(isFront({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 })).toBe(false);
        expect(isFront({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 })).toBe(false);
    });

    test("checker alternates", () => {
        expect(BLUE).not.toBe(WHITE);
        expect(cellColor(0, 0)).toBe(BLUE);
        expect(cellColor(1, 0)).toBe(WHITE);
        expect(cellColor(0, 1)).toBe(WHITE);
        expect(cellColor(1, 1)).toBe(BLUE);
        for (let k = 0; k < GRID; k++) {
            const row = Array.from({ length: GRID }, (_, i) => cellColor(i, k));
            const col = Array.from({ length: GRID }, (_, j) => cellColor(k, j));
            expect(row.filter((c) => c === BLUE).length).toBe(GRID / 2);
            expect(col.filter((c) => c === WHITE).length).toBe(GRID / 2);
        }
    });

    test("renders and moves", async () => {
        const res = await runEffect(Glenz, 40, 20);
        expect(res.checkpoints["0"]).not.toBe(res.checkpoints["39"]);
        expect(res.checkpoints["19"]).not.toBe(res.checkpoints["39"]);
    });
});
