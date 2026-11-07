/*
 * @file    cube.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotating texture-mapped cube in Typescript
 */

//----- imports
import { Point2D, Point3D } from "library/core/interfaces";

//----- globals
export const CUBE_SIZE = 100; // half edge length

/* 8 corners (camera space: x right, y down, z away from the camera)
 *
 *      front (z = -S)      back (z = +S)
 *       0 ---- 1            4 ---- 5
 *       |      |            |      |
 *       3 ---- 2            7 ---- 6
 */
export const VERTICES: Point3D[] = [
    { x: -CUBE_SIZE, y: -CUBE_SIZE, z: -CUBE_SIZE },
    { x: CUBE_SIZE, y: -CUBE_SIZE, z: -CUBE_SIZE },
    { x: CUBE_SIZE, y: CUBE_SIZE, z: -CUBE_SIZE },
    { x: -CUBE_SIZE, y: CUBE_SIZE, z: -CUBE_SIZE },
    { x: -CUBE_SIZE, y: -CUBE_SIZE, z: CUBE_SIZE },
    { x: CUBE_SIZE, y: -CUBE_SIZE, z: CUBE_SIZE },
    { x: CUBE_SIZE, y: CUBE_SIZE, z: CUBE_SIZE },
    { x: -CUBE_SIZE, y: CUBE_SIZE, z: CUBE_SIZE },
];

/* 6 faces, opposite pairs are (0,1), (2,3), (4,5)
 *
 * Seen from outside, the vertices are: top-left, top-right, bottom-right, bottom-left
 * of the image (clockwise on screen with y down), matching FACE_UV.
 */
export const FACES: number[][] = [
    [0, 1, 2, 3], // front  (z = -S)
    [5, 4, 7, 6], // back   (z = +S)
    [4, 0, 3, 7], // left   (x = -S)
    [1, 5, 6, 2], // right  (x = +S)
    [4, 5, 1, 0], // top    (y = -S)
    [3, 2, 6, 7], // bottom (y = +S)
];

// texture coordinates of each face vertex (texture is 256x256)
export const FACE_UV: Point2D[] = [
    { x: 0, y: 0 },
    { x: 256, y: 0 },
    { x: 256, y: 256 },
    { x: 0, y: 256 },
];

// unit vector toward the light: top-left-front, normalised (-1, -1, -2)
const LIGHT: Point3D = { x: -1 / Math.sqrt(6), y: -1 / Math.sqrt(6), z: -2 / Math.sqrt(6) };
const AMBIENT = 0.4; // minimum face brightness
const DIFFUSE = 0.6; // brightness added by the light

//----- functions
/* rotate points around X, then Y, then Z
 *
 * Args:
 *      p      : points to rotate
 *      cx, sx : cosine / sine of the X angle (same for Y and Z)
 *      out    : rotated points (same length as p, written in place)
 */
export function rotate(
    p: Point3D[],
    cx: number,
    sx: number,
    cy: number,
    sy: number,
    cz: number,
    sz: number,
    out: Point3D[],
): void {
    for (let i = 0; i < p.length; i++) {
        const { x, y, z } = p[i];

        // X axis
        const y1 = y * cx - z * sx;
        const z1 = y * sx + z * cx;

        // Y axis
        const x2 = x * cy + z1 * sy;
        const z2 = z1 * cy - x * sy;

        // Z axis
        const o = out[i];
        o.x = x2 * cz - y1 * sz;
        o.y = x2 * sz + y1 * cz;
        o.z = z2;
    }
}

// back-face culling: a face is visible when its first 3 projected vertices turn clockwise (y down)
export function isVisible(a: Point2D, b: Point2D, c: Point2D): boolean {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}

// flat shading of a face: AMBIENT + DIFFUSE * max(0, n.L), n = unit outward normal
export function faceShade(p: Point3D[], face: number[]): number {
    const a = p[face[0]];
    const b = p[face[1]];
    const d = p[face[3]];

    // (right x down) points inward: the outward normal is (down x right)
    const rx = b.x - a.x;
    const ry = b.y - a.y;
    const rz = b.z - a.z;
    const dx = d.x - a.x;
    const dy = d.y - a.y;
    const dz = d.z - a.z;
    const nx = dy * rz - dz * ry;
    const ny = dz * rx - dx * rz;
    const nz = dx * ry - dy * rx;

    const dot = (nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z) / Math.hypot(nx, ny, nz);
    return Math.min(1, AMBIENT + DIFFUSE * Math.max(0, dot));
}
