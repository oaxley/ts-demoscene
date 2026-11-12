/*
 * @file    mesh.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Shared meshes and flat shading (camera space: x right, y down, z away from the camera)
 */

//----- imports
import { Point2D, Point3D } from "library/core/interfaces";

//----- globals
/* 6 faces of the cube (see cubeVertices), opposite pairs are (0,1), (2,3), (4,5)
 *
 * Seen from outside, the vertices are: top-left, top-right, bottom-right, bottom-left
 * (clockwise on screen with y down when the face looks at the camera).
 */
export const CUBE_FACES: number[][] = [
    [0, 1, 2, 3], // front  (z = -S)
    [5, 4, 7, 6], // back   (z = +S)
    [4, 0, 3, 7], // left   (x = -S)
    [1, 5, 6, 2], // right  (x = +S)
    [4, 5, 1, 0], // top    (y = -S)
    [3, 2, 6, 7], // bottom (y = +S)
];

// unit vector toward a top-left-front light: (-1, -1, -2) normalised
export const LIGHT_TOP_LEFT: Point3D = { x: -1 / Math.sqrt(6), y: -1 / Math.sqrt(6), z: -2 / Math.sqrt(6) };

//----- functions

/* 8 corners of a cube centred on the origin
 *
 *      front (z = -S)      back (z = +S)
 *       0 ---- 1            4 ---- 5
 *       |      |            |      |
 *       3 ---- 2            7 ---- 6
 *
 * Args:
 *      size: half edge length (S)
 */
export function cubeVertices(size: number): Point3D[] {
    return [
        { x: -size, y: -size, z: -size },
        { x: size, y: -size, z: -size },
        { x: size, y: size, z: -size },
        { x: -size, y: size, z: -size },
        { x: -size, y: -size, z: size },
        { x: size, y: -size, z: size },
        { x: size, y: size, z: size },
        { x: -size, y: size, z: size },
    ];
}

// =true when the 3 projected points turn clockwise on screen (y down): the face looks at the camera
export function isClockwise(a: Point2D, b: Point2D, c: Point2D): boolean {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}

/* flat (Lambert) shading: ambient + diffuse * (n.L), clamped to 1
 *
 * Args:
 *      nx, ny, nz : surface normal (any length, not zero)
 *      light      : unit vector toward the light
 *      ambient    : minimum brightness
 *      diffuse    : brightness added by the light
 *      twoSided   : =true to light both sides (|n.L|), otherwise max(0, n.L)
 */
export function lambert(
    nx: number,
    ny: number,
    nz: number,
    light: Point3D,
    ambient: number,
    diffuse: number,
    twoSided: boolean,
): number {
    const dot = (nx * light.x + ny * light.y + nz * light.z) / Math.hypot(nx, ny, nz);
    return Math.min(1, ambient + diffuse * (twoSided ? Math.abs(dot) : Math.max(0, dot)));
}
