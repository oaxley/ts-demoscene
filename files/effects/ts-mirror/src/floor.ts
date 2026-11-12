/*
 * @file    floor.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Checkered floor, sky and environment map (ts-mirror)
 *
 *          The camera looks along +z (y down), the floor is the plane y = FLOOR_Y. A screen row
 *          below the horizon sees the floor at a constant depth z = FLOOR_Y * ZOOM / (y - HORIZON),
 *          so the floor is drawn row by row. The checker fades toward the sky colour with the
 *          depth (fog): the far squares never turn into noise and the floor melts into the sky.
 *
 *          The environment map uses the very same colours: a direction going down hits the
 *          floor (seen from the torus centre), a direction going up sees the sky.
 */

//----- imports
import { Point3D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";

import { envDirection } from "./torus";

//----- globals
export const ZOOM = 600; // projection: x * ZOOM / z
export const HORIZON = 160; // screen row of the horizon (projection centre y)
export const FLOOR_Y = 210; // floor plane height (camera space, y down)
export const TILE = 60; // checker square size (world units)
export const FOG = 1500; // floor light: exp(-z / FOG), mixed toward the sky

export const SKY: [number, number, number] = [24, 40, 110]; // sky and fog colour
export const CHECK_A: [number, number, number] = [230, 230, 240]; // checker colours
export const CHECK_B: [number, number, number] = [30, 60, 200];

export const SKY_COLOR = RGBA.toUInt32(SKY[0], SKY[1], SKY[2]);

const Z_FAR = 1e6; // beyond this depth the floor is only fog

//----- functions

// colour c mixed toward the sky: c * f + SKY * (1 - f)
function fogged(c: number[], f: number): number {
    const g = 1 - f;
    return RGBA.toUInt32(
        Math.round(c[0] * f + SKY[0] * g),
        Math.round(c[1] * f + SKY[1] * g),
        Math.round(c[2] * f + SKY[2] * g),
    );
}

/* colour of the floor at a world point
 *
 * Args:
 *      x, z   : floor point (z: depth from the camera)
 *      scroll : checker offset along z (the floor moves toward the viewer)
 */
export function floorColor(x: number, z: number, scroll: number): number {
    // |z|: the mirror also sees the floor behind the camera
    const d = Math.abs(z);
    if (!(d < Z_FAR) || !Number.isFinite(x)) {
        return SKY_COLOR;
    }
    const odd = (Math.floor(x / TILE) + Math.floor((z + scroll) / TILE)) & 1;
    return fogged(odd ? CHECK_B : CHECK_A, Math.exp(-d / FOG));
}

/* draw the sky (rows 0..HORIZON) and the floor (rows below)
 *
 * Args:
 *      dst    : destination pixels (ABGR), width x height
 *      scroll : checker offset along z
 */
export function drawFloor(dst: Uint32Array, width: number, height: number, scroll: number): void {
    const sky = Math.min(height, HORIZON + 1);
    dst.fill(SKY_COLOR, 0, sky * width);

    const half = width / 2;
    for (let y = sky; y < height; y++) {
        // constant depth on the row: fog and checker row computed once
        const z = (FLOOR_Y * ZOOM) / (y - HORIZON);
        const f = Math.exp(-z / FOG);
        const zOdd = Math.floor((z + scroll) / TILE) & 1;
        const even = fogged(zOdd ? CHECK_B : CHECK_A, f);
        const odd = fogged(zOdd ? CHECK_A : CHECK_B, f);

        // x is linear along the row
        const dx = z / ZOOM;
        let x = -half * dx;
        let p = y * width;
        for (let sx = 0; sx < width; sx++, x += dx) {
            dst[p++] = Math.floor(x / TILE) & 1 ? odd : even;
        }
    }
}

/* environment map seen from the torus centre (256x256, index (v << 8) | u)
 *
 * Args:
 *      map        : the map pixels (ABGR), written
 *      ox, oy, oz : torus centre (camera space)
 *      scroll     : checker offset along z
 */
const dir: Point3D = { x: 0, y: 0, z: 0 };
export function buildEnvMap(map: Uint32Array, ox: number, oy: number, oz: number, scroll: number): void {
    const h = FLOOR_Y - oy;
    for (let v = 0; v < 256; v++) {
        for (let u = 0; u < 256; u++) {
            let c = SKY_COLOR;
            if (envDirection(u, v, dir) && dir.y > 0) {
                const t = h / dir.y;
                c = floorColor(ox + dir.x * t, oz + dir.z * t, scroll);
            }
            map[(v << 8) | u] = c;
        }
    }
}
