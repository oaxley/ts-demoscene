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
            let angle = (i * Math.PI) / 180.0;
            this.cos[i] = Math.cos(angle);
            this.sin[i] = Math.sin(angle);
        }
    }
}


//----- functions

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
export function projectSameAngle(points: Point3D[], output: Point2D[], c: number, s: number,
                                 center: Point2D, depth: number, zoom: number): void {
    let ss = s * s;

    let m00 = c * c;
    let m10 = s * c;
    let m20 = -s;

    let m01 = m10 * s - m10;
    let m11 = ss * s + m00;
    let m21 = m10;

    let m02 = m10 * c + ss;
    let m12 = m01;
    let m22 = m00;

    let a0 = -(m01 * m00);
    let a1 = -(m11 * m10);
    let a2 = -(m21 * m20);

    for (let i = 0; i < points.length; i++) {
        let x = points[i].x;
        let y = points[i].y;
        let z = points[i].z;
        let xy = -x*y;

        let px = (m01 + x) * (m00 + y) + a0 + xy + m02*z;
        let py = (m11 + x) * (m10 + y) + a1 + xy + m12*z;
        let pz = (m21 + x) * (m20 + y) + a2 + xy + m22*z;

        output[i].x = (center.x) + Math.floor((px * zoom) / (pz + depth));
        output[i].y = (center.y) + Math.floor((py * zoom) / (pz + depth));
    }
}
