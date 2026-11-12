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
 *          Far away, a pixel covers many squares: picking one of them gives noise (aliasing). The
 *          checker is box filtered instead: each pixel gets the average of the squares under its
 *          footprint, computed exactly with the integral of the square wave.
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
export const FOG = 1500; // floor light: exp(-distance / FOG), mixed toward the sky
export const MIRROR_FOG = 600; // shorter fog in the mirror: the 256x256 map can't show far squares

export const SKY: [number, number, number] = [24, 40, 110]; // sky and fog colour
export const CHECK_A: [number, number, number] = [230, 230, 240]; // checker colours
export const CHECK_B: [number, number, number] = [0, 0, 0];

export const SKY_COLOR = RGBA.toUInt32(SKY[0], SKY[1], SKY[2]);

const Z_FAR = 1e6; // beyond this depth the floor is only fog
const LEVELS = 16; // mix steps between the two checker colours
const ENV_BLUR = 2; // environment map filter width (texels): the torus shrinks the map a lot

//----- functions

/* checker colour for an odd share t, mixed toward the sky by the fog f:
 * mix(A, B, t) * f + SKY * (1 - f)
 */
function shade(t: number, f: number): number {
    const g = 1 - f;
    return RGBA.toUInt32(
        Math.round((CHECK_A[0] + (CHECK_B[0] - CHECK_A[0]) * t) * f + SKY[0] * g),
        Math.round((CHECK_A[1] + (CHECK_B[1] - CHECK_A[1]) * t) * f + SKY[1] * g),
        Math.round((CHECK_A[2] + (CHECK_B[2] - CHECK_A[2]) * t) * f + SKY[2] * g),
    );
}

// integral of the 1D square wave (1 on odd squares [2k+1, 2k+2[, 0 on even ones) from 0 to x
function oddIntegral(x: number): number {
    const h = x / 2;
    const f = Math.floor(h);
    return f + 2 * Math.max(h - f - 0.5, 0);
}

// share of odd squares in [x - w/2, x + w/2] (w = 0: the square at x)
function oddShare(x: number, w: number): number {
    if (w < 1e-6) {
        return Math.floor(x) & 1;
    }
    const s = (oddIntegral(x + w / 2) - oddIntegral(x - w / 2)) / w;
    return s < 0 ? 0 : s > 1 ? 1 : s; // rounding errors
}

/* box filtered checker
 *
 * Args:
 *      x, z   : point (in squares)
 *      wx, wz : footprint (in squares)
 *
 * Returns:
 *      share of the odd (CHECK_B) colour under the footprint, in [0, 1]
 */
export function checker(x: number, z: number, wx: number, wz: number): number {
    const a = oddShare(x, wx);
    const b = oddShare(z, wz);
    return a + b - 2 * a * b; // odd when exactly one of the two is odd
}

// checker colours mixed by the odd share k / LEVELS and fogged by f
function mixedColors(f: number, out: Uint32Array): void {
    for (let k = 0; k <= LEVELS; k++) {
        out[k] = shade(k / LEVELS, f);
    }
}

/* colour of the floor at a world point
 *
 * Args:
 *      x, z   : floor point (camera space, z: depth)
 *      scroll : checker offset along z (the floor moves toward the viewer)
 *      dist   : distance used by the fog (default |z|: the depth, the mirror also sees the
 *               floor behind the camera)
 *      fog    : fog distance (default FOG)
 *      wx, wz : footprint on the floor (world units, default 0: sharp)
 */
export function floorColor(
    x: number,
    z: number,
    scroll: number,
    dist: number = Math.abs(z),
    fog: number = FOG,
    wx: number = 0,
    wz: number = 0,
): number {
    const d = dist;
    if (!(d < Z_FAR) || !Number.isFinite(x) || !Number.isFinite(z)) {
        return SKY_COLOR;
    }
    return shade(checker(x / TILE, (z + scroll) / TILE, wx / TILE, wz / TILE), Math.exp(-d / fog));
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
    const colors = new Uint32Array(LEVELS + 1);
    for (let y = sky; y < height; y++) {
        // constant depth on the row: fog (by depth, the screen is narrow), depth share and the
        // fogged colours computed once; the footprint of a pixel is one row deep, one pixel wide
        const z = (FLOOR_Y * ZOOM) / (y - HORIZON);
        mixedColors(Math.exp(-z / FOG), colors);
        const b = oddShare((z + scroll) / TILE, (z * z) / (FLOOR_Y * ZOOM * TILE));
        const b2 = 1 - 2 * b;

        // x is linear along the row
        const dx = z / ZOOM;
        const wx = dx / TILE;
        let x = (-half * dx) / TILE;
        let p = y * width;
        const hw = wx / 2;
        const even = colors[Math.round(b * LEVELS)];
        const odd = colors[Math.round((b2 + b) * LEVELS)];
        for (let sx = 0; sx < width; sx++, x += wx) {
            // pixel footprint inside one square: no filtering needed
            const f = Math.floor(x - hw);
            if (f === Math.floor(x + hw)) {
                dst[p++] = f & 1 ? odd : even;
            } else {
                dst[p++] = colors[Math.round((oddShare(x, wx) * b2 + b) * LEVELS)];
            }
        }
    }
}

/* geometry of the environment map texels, for a torus 1 unit above the floor
 *
 * Everything scales with the height h of the torus above the floor: the floor point seen by a
 * texel (fx, fz), its distance and its footprint (wx, wz). Computed once, NaN = sky texel.
 */
interface EnvGeometry {
    fx: Float64Array;
    fz: Float64Array;
    dist: Float64Array;
    wx: Float64Array;
    wz: Float64Array;
}

let envGeometry: EnvGeometry | undefined;

function getEnvGeometry(): EnvGeometry {
    if (envGeometry) {
        return envGeometry;
    }
    const n = 256 * 256;
    const g: EnvGeometry = {
        fx: new Float64Array(n).fill(NaN),
        fz: new Float64Array(n),
        dist: new Float64Array(n),
        wx: new Float64Array(n),
        wz: new Float64Array(n),
    };
    const dir: Point3D = { x: 0, y: 0, z: 0 };
    for (let v = 0; v < 256; v++) {
        for (let u = 0; u < 256; u++) {
            if (!envDirection(u, v, dir) || dir.y <= 0) {
                continue;
            }
            const i = (v << 8) | u;
            const fx = dir.x / dir.y;
            const fz = dir.z / dir.y;
            const dist = Math.hypot(fx, fz);

            // footprint of the texel on the floor: theta = angle from straight down,
            // rho = sin(theta / 2) and one texel is 1 / 127 in rho, so
            // dtheta = 2 / (127 cos(theta / 2)): radial size sec²(theta) dtheta, tangential
            // size dist * dphi with dphi = (1 / 127) / rho
            const cosT = dir.y;
            const half = Math.sqrt((1 + cosT) / 2); // cos(theta / 2)
            const rho = Math.max(Math.sqrt((1 - cosT) / 2), 1e-9); // sin(theta / 2)
            const radial = (ENV_BLUR * 2) / (127 * half * cosT * cosT);
            const tangent = (ENV_BLUR * dist) / (127 * rho);
            const cx = dist > 0 ? Math.abs(fx / dist) : 1;
            const cz = dist > 0 ? Math.abs(fz / dist) : 0;

            g.fx[i] = fx;
            g.fz[i] = fz;
            g.dist[i] = dist;
            g.wx[i] = cx * radial + cz * tangent;
            g.wz[i] = cz * radial + cx * tangent;
        }
    }
    envGeometry = g;
    return g;
}

/* environment map seen from the torus centre (256x256, index (v << 8) | u)
 *
 * Args:
 *      map        : the map pixels (ABGR), written
 *      ox, oy, oz : torus centre (camera space)
 *      scroll     : checker offset along z
 */
export function buildEnvMap(map: Uint32Array, ox: number, oy: number, oz: number, scroll: number): void {
    const { fx, fz, dist, wx, wz } = getEnvGeometry();
    const h = FLOOR_Y - oy;
    const k = h / TILE; // world units -> squares
    const x0 = ox / TILE;
    const z0 = (oz + scroll) / TILE;
    const fog = -h / MIRROR_FOG;

    for (let i = 0; i < map.length; i++) {
        const x = fx[i];
        if (x !== x) {
            // NaN: sky
            map[i] = SKY_COLOR;
            continue;
        }
        const d = dist[i];
        if (!(d * h < Z_FAR)) {
            map[i] = SKY_COLOR;
            continue;
        }
        const t = checker(x0 + x * k, z0 + fz[i] * k, wx[i] * k, wz[i] * k);
        map[i] = shade(t, Math.exp(d * fog));
    }
}
