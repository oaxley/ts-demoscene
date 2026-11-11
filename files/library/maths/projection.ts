/*
 * @file    projection.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   3D -> 2D projection helpers
 */

//----- imports
import { Point2D, Point3D } from "library/core/interfaces";

//----- class

// precomputed cosine / sine tables for integer angles in degrees [0..359]
export class TrigTables {
    //----- members
    public readonly cos: number[] = [];
    public readonly sin: number[] = [];

    //----- methods
    constructor() {
        for (let i = 0; i < 360; i++) {
            const angle = (i * Math.PI) / 180.0;
            this.cos[i] = Math.cos(angle);
            this.sin[i] = Math.sin(angle);
        }
    }
}

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

/* project 3D points on the screen, rotated by the same angle on the 3 axis
 *
 * Because the angle is the same for all the axis, the rotation matrix can be
 * simplified a lot.
 *
 * Args:
 *      points: the 3D points
 *      output: the projected 2D points (must have the same length as points)
 *      c, s  : cosine and sine of the rotation angle
 *      center: center of the projection on the screen
 *      depth : distance between the eye and the screen
 *      zoom  : zoom factor
 */
export function projectSameAngle(
    points: Point3D[],
    output: Point2D[],
    c: number,
    s: number,
    center: Point2D,
    depth: number,
    zoom: number,
): void {
    const ss = s * s;

    const m00 = c * c;
    const m10 = s * c;
    const m20 = -s;

    const m01 = m10 * s - m10;
    const m11 = ss * s + m00;
    const m21 = m10;

    const m02 = m10 * c + ss;
    const m12 = m01;
    const m22 = m00;

    const a0 = -(m01 * m00);
    const a1 = -(m11 * m10);
    const a2 = -(m21 * m20);

    for (let i = 0; i < points.length; i++) {
        const x = points[i].x;
        const y = points[i].y;
        const z = points[i].z;
        const xy = -x * y;

        const px = (m01 + x) * (m00 + y) + a0 + xy + m02 * z;
        const py = (m11 + x) * (m10 + y) + a1 + xy + m12 * z;
        const pz = (m21 + x) * (m20 + y) + a2 + xy + m22 * z;

        output[i].x = center.x + Math.floor((px * zoom) / (pz + depth));
        output[i].y = center.y + Math.floor((py * zoom) / (pz + depth));
    }
}
