/*
 * @file    torus.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Torus mesh, mirror reflection and sphere environment map (ts-mirror)
 *
 *          The mirror is an environment map: a 256x256 picture of what is seen in every
 *          direction. A unit direction r is mapped like a "sphere map" whose axis points straight
 *          down (+y, camera space is y down):
 *
 *              m = sqrt(2 (1 + r.y)),  u = 128 + 127 r.x / m,  v = 128 + 127 r.z / m
 *
 *          The centre of the map is straight down (the floor under the torus), the horizon is the
 *          circle of radius 127 / sqrt(2), the sky is the outer ring. The only singular direction
 *          (the whole rim of the map) is straight up: it is always sky, so it can never smear the
 *          floor.
 */

//----- imports
import { Point2D, Point3D } from "library/core/interfaces";

//----- interfaces
export interface TorusMesh {
    vertices: Point3D[]; // ring * tube points, index i * tube + j
    normals: Point3D[]; // unit outward normals (same index)
    quads: number[][]; // 4 vertex indices, clockwise on screen (y down) when seen from outside
}

//----- functions

/* torus centred on the origin, the ring in the X/Z plane
 *
 * Args:
 *      major : ring radius (centre to tube centre)
 *      minor : tube radius
 *      ring  : segments around the ring
 *      tube  : segments around the tube
 */
export function torusMesh(major: number, minor: number, ring: number, tube: number): TorusMesh {
    const vertices: Point3D[] = [];
    const normals: Point3D[] = [];
    const quads: number[][] = [];

    for (let i = 0; i < ring; i++) {
        const a = (2 * Math.PI * i) / ring;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        for (let j = 0; j < tube; j++) {
            const b = (2 * Math.PI * j) / tube;
            const cb = Math.cos(b);
            const sb = Math.sin(b);
            const d = major + minor * cb;
            vertices.push({ x: d * ca, y: minor * sb, z: d * sa });
            normals.push({ x: cb * ca, y: sb, z: cb * sa });
        }
    }

    for (let i = 0; i < ring; i++) {
        const i1 = (i + 1) % ring;
        for (let j = 0; j < tube; j++) {
            const j1 = (j + 1) % tube;
            quads.push([i * tube + j, i1 * tube + j, i1 * tube + j1, i * tube + j1]);
        }
    }

    return { vertices, normals, quads };
}

// mirror reflection of the direction d on the unit normal n: out = d - 2 (d.n) n
export function reflect(d: Point3D, n: Point3D, out: Point3D): void {
    const k = 2 * (d.x * n.x + d.y * n.y + d.z * n.z);
    out.x = d.x - k * n.x;
    out.y = d.y - k * n.y;
    out.z = d.z - k * n.z;
}

// texel coordinates of a unit direction in the sphere map (straight up -> a rim texel)
export function sphereUV(r: Point3D, out: Point2D): void {
    const m2 = 2 * (1 + r.y);
    if (m2 < 2e-9) {
        out.x = 128;
        out.y = 255;
        return;
    }
    const k = 127 / Math.sqrt(m2);
    out.x = 128 + r.x * k;
    out.y = 128 + r.z * k;
}

/* unit direction seen at the centre of texel (u, v) of the sphere map
 *
 * Returns:
 *      false when the texel is outside the map disc (out is not written)
 */
export function envDirection(u: number, v: number, out: Point3D): boolean {
    const p = (u + 0.5 - 128) / 127;
    const q = (v + 0.5 - 128) / 127;
    const rho2 = p * p + q * q;
    if (rho2 > 1) {
        return false;
    }
    const k = 2 * Math.sqrt(1 - rho2);
    out.x = p * k;
    out.y = 1 - 2 * rho2;
    out.z = q * k;
    return true;
}

/* the sky map: the same sphere map with its axis pointing straight up
 *
 * Its centre is the sky overhead, its only singular direction (the rim) is straight down. The
 * mirror uses it for the quads that see the sky: the floor map squeezes everything above into its
 * rim, where the clouds would smear.
 */
const flip: Point3D = { x: 0, y: 0, z: 0 };
export function skyUV(r: Point3D, out: Point2D): void {
    flip.x = r.x;
    flip.y = -r.y;
    flip.z = r.z;
    sphereUV(flip, out);
}

// unit direction seen at the centre of texel (u, v) of the sky map (false outside the disc)
export function skyDirection(u: number, v: number, out: Point3D): boolean {
    if (!envDirection(u, v, out)) {
        return false;
    }
    out.y = -out.y;
    return true;
}
