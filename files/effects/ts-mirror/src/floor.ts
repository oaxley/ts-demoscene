/*
 * @file    floor.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Checkered floor and environment map (ts-mirror)
 *
 *          The camera looks along +z (y down), the floor is the plane y = FLOOR_Y. A screen row
 *          below the horizon sees the floor at a constant depth z = FLOOR_Y * ZOOM / (y - HORIZON),
 *          so the floor is drawn row by row. The checker fades toward the horizon haze with the
 *          depth (fog): the far squares never turn into noise and the floor melts into the sky.
 *
 *          Far away, a pixel covers many squares: picking one of them gives noise (aliasing). The
 *          checker is box filtered instead: each pixel gets the average of the squares under its
 *          footprint, computed exactly with the integral of the square wave.
 *
 *          The environment maps use the very same colours: a direction going down hits the
 *          floor (seen from the torus centre), a direction going up hits the cloud ceiling.
 */

//----- imports
import { Point3D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";

import { envDirection, skyDirection } from "./torus";
import { skyShades, gradient, getClouds, CLOUD_Y, CLOUD_TEXEL, CLOUD_FOG, SHADES } from "./sky";
import { sampleLevel } from "./clouds";

//----- globals
export const ZOOM = 600; // projection: x * ZOOM / z
export const HORIZON = 160; // screen row of the horizon (projection centre y)
export const FLOOR_Y = 210; // floor plane height (camera space, y down)
export const TILE = 60; // checker square size (world units)
export const FOG = 1500; // floor light: exp(-distance / FOG), mixed toward the sky
export const MIRROR_FOG = 600; // shorter fog in the mirror: the 256x256 map can't show far squares

export const HAZE: [number, number, number] = [105, 135, 175]; // horizon haze: the fog colour of the floor and the clouds
export const CHECK_A: [number, number, number] = [230, 230, 240]; // checker colours
export const CHECK_B: [number, number, number] = [0, 0, 0];

export const HAZE_COLOR = RGBA.toUInt32(HAZE[0], HAZE[1], HAZE[2]);

const Z_FAR = 1e6; // beyond this depth the floor is only fog
const LEVELS = 16; // mix steps between the two checker colours
const ENV_BLUR = 2; // environment map filter width (texels): the torus shrinks the map a lot

//----- functions

/* checker colour for an odd share t, mixed toward the sky by the fog f:
 * mix(A, B, t) * f + HAZE * (1 - f)
 */
function shade(t: number, f: number): number {
    const g = 1 - f;
    return RGBA.toUInt32(
        Math.round((CHECK_A[0] + (CHECK_B[0] - CHECK_A[0]) * t) * f + HAZE[0] * g),
        Math.round((CHECK_A[1] + (CHECK_B[1] - CHECK_A[1]) * t) * f + HAZE[1] * g),
        Math.round((CHECK_A[2] + (CHECK_B[2] - CHECK_A[2]) * t) * f + HAZE[2] * g),
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
        return HAZE_COLOR;
    }
    return shade(checker(x / TILE, (z + scroll) / TILE, wx / TILE, wz / TILE), Math.exp(-d / fog));
}

/* draw the floor (the rows below the horizon, the sky is drawn by sky.ts)
 *
 * Args:
 *      dst    : destination pixels (ABGR), width x height
 *      scroll : checker offset along z
 */
export function drawFloor(dst: Uint32Array, width: number, height: number, scroll: number): void {
    const sky = Math.min(height, HORIZON + 1);
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

/* geometry of the environment map texels, for planes 1 unit away from the torus
 *
 * A texel looks in one direction: down, it hits the floor; up, it hits the cloud ceiling. The
 * hit point (px, pz), its distance and its footprint (wx, wz) scale with the distance between
 * the torus and that plane, so they are computed once per map. `up` marks the texels hitting the
 * ceiling (with the upward share of the direction for the sky gradient), NaN = no hit.
 */
interface EnvGeometry {
    px: Float64Array;
    pz: Float64Array;
    dist: Float64Array;
    wx: Float64Array;
    wz: Float64Array;
    up: Float64Array; // 0: floor texel, > 0: ceiling texel (upward share), NaN: outside
    band: Uint8Array; // ceiling texels: gradient band (index in the colour tables)
    lw: Float64Array; // ceiling texels: log2 of the footprint (unit distance)
}

const BANDS = 32; // gradient steps in the sky part of the maps
const FADE_STEPS = 16; // cloud visibility steps in the sky part of the maps
const skyTables = new Uint32Array(BANDS * FADE_STEPS * (SHADES + 1));
let skyTablesReady = false;

// colour tables of the ceiling texels: gradient band x visibility step x density step
function getSkyTables(): Uint32Array {
    if (!skyTablesReady) {
        const row = new Uint32Array(SHADES + 1);
        for (let b = 0; b < BANDS; b++) {
            for (let f = 0; f < FADE_STEPS; f++) {
                skyShades(gradient((b + 0.5) / BANDS), f / (FADE_STEPS - 1), row);
                skyTables.set(row, (b * FADE_STEPS + f) * (SHADES + 1));
            }
        }
        skyTablesReady = true;
    }
    return skyTables;
}

const envGeometry: (EnvGeometry | undefined)[] = [undefined, undefined];

function getEnvGeometry(sky: boolean): EnvGeometry {
    const cached = envGeometry[sky ? 1 : 0];
    if (cached) {
        return cached;
    }
    const n = 256 * 256;
    const g: EnvGeometry = {
        px: new Float64Array(n),
        pz: new Float64Array(n),
        dist: new Float64Array(n),
        wx: new Float64Array(n),
        wz: new Float64Array(n),
        up: new Float64Array(n).fill(NaN),
        band: new Uint8Array(n),
        lw: new Float64Array(n),
    };
    const dir: Point3D = { x: 0, y: 0, z: 0 };
    for (let v = 0; v < 256; v++) {
        for (let u = 0; u < 256; u++) {
            if (!(sky ? skyDirection(u, v, dir) : envDirection(u, v, dir))) {
                continue;
            }
            const i = (v << 8) | u;
            // cosine to the plane normal (floor below, ceiling above), cosine to the map pole
            const toPlane = Math.abs(dir.y);
            if (toPlane < 1e-9) {
                g.up[i] = 0;
                g.dist[i] = Infinity;
                continue;
            }
            const toPole = sky ? -dir.y : dir.y;
            const px = dir.x / toPlane;
            const pz = dir.z / toPlane;
            const dist = Math.hypot(px, pz);

            // footprint of the texel on the plane: theta = angle from the pole, rho = sin(theta / 2)
            // and one texel is 1 / 127 in rho, so dtheta = 2 / (127 cos(theta / 2)); the radial
            // size on the plane is sec²(angle to the normal) dtheta, the tangential size is
            // dist * dphi with dphi = (1 / 127) / rho
            const half = Math.sqrt(Math.max((1 + toPole) / 2, 1e-9)); // cos(theta / 2)
            const rho = Math.max(Math.sqrt((1 - toPole) / 2), 1e-9); // sin(theta / 2)
            const radial = (ENV_BLUR * 2) / (127 * half * toPlane * toPlane);
            const tangent = (ENV_BLUR * dist) / (127 * rho);
            const cx = dist > 0 ? Math.abs(px / dist) : 1;
            const cz = dist > 0 ? Math.abs(pz / dist) : 0;

            g.px[i] = px;
            g.pz[i] = pz;
            g.dist[i] = dist;
            g.wx[i] = cx * radial + cz * tangent;
            g.wz[i] = cz * radial + cx * tangent;
            g.up[i] = dir.y < 0 ? -dir.y : 0;
            g.band[i] = Math.min(BANDS - 1, Math.floor(g.up[i] * BANDS));
            g.lw[i] = Math.log2(Math.max(g.wx[i], g.wz[i], 1e-9));
        }
    }
    envGeometry[sky ? 1 : 0] = g;
    return g;
}

/* environment map seen from the torus centre (256x256, index (v << 8) | u)
 *
 * Args:
 *      map         : the map pixels (ABGR), written
 *      ox, oy, oz  : torus centre (camera space)
 *      scroll      : checker offset along z
 *      cloudScroll : cloud offset along z
 *      sky         : false: floor map (pole straight down), true: sky map (pole straight up)
 */
export function buildEnvMap(
    map: Uint32Array,
    ox: number,
    oy: number,
    oz: number,
    scroll: number,
    cloudScroll: number,
    sky: boolean,
): void {
    const { px, pz, dist, wx, wz, up, band, lw } = getEnvGeometry(sky);
    const h = FLOOR_Y - oy; // torus to floor
    const hc = oy - CLOUD_Y; // torus to ceiling
    const k = h / TILE; // world units -> squares
    const x0 = ox / TILE;
    const z0 = (oz + scroll) / TILE;
    const fog = -h / MIRROR_FOG;

    const clouds = getClouds();
    const tables = getSkyTables();
    const kc = hc / CLOUD_TEXEL; // world units -> cloud texels
    const cx0 = ox / CLOUD_TEXEL;
    const cz0 = (oz + cloudScroll) / CLOUD_TEXEL;
    const fade = hc / CLOUD_FOG;
    const log2kc = Math.log2(kc) + 0.5; // + 0.5: the level is rounded (one bilinear lookup)
    const last = clouds.levels.length - 1;

    // the even texels only: the map is filtered ENV_BLUR = 2 texels wide, so the odd ones are
    // the average of their neighbours (4 times less work)
    for (let v = 0; v < 256; v += 2) {
        for (let u = 0; u < 256; u += 2) {
            const i = (v << 8) | u;
            const a = up[i];
            if (a !== a) {
                // NaN: outside the disc
                map[i] = HAZE_COLOR;
                continue;
            }
            const d = dist[i];
            if (a > 0) {
                // the ceiling: the clouds seen from the torus; filter level log2 of the footprint,
                // cloud visibility exp(-distance / CLOUD_FOG) in steps
                let level = (lw[i] + log2kc) | 0;
                level = level < 0 ? 0 : level > last ? last : level;
                const c = sampleLevel(clouds, level, cx0 + px[i] * kc, cz0 + pz[i] * kc);
                const fs = ((FADE_STEPS - 1) * Math.exp(-d * fade) + 0.5) | 0;
                map[i] = tables[(band[i] * FADE_STEPS + fs) * (SHADES + 1) + ((c * SHADES + 0.5) | 0)];
                continue;
            }
            if (!(d * h < Z_FAR)) {
                map[i] = HAZE_COLOR;
                continue;
            }
            const t = checker(x0 + px[i] * k, z0 + pz[i] * k, wx[i] * k, wz[i] * k);
            map[i] = shade(t, Math.exp(d * fog));
        }
    }
    fillOdd(map);
}

// average of two ABGR colours, channel by channel
function average(a: number, b: number): number {
    return (((a & 0xfefefefe) >>> 1) + ((b & 0xfefefefe) >>> 1) + (a & b & 0x01010101)) >>> 0;
}

// fill the odd texels of a map whose even texels are set (the last row and column copy their neighbour)
function fillOdd(map: Uint32Array): void {
    for (let v = 0; v < 256; v += 2) {
        const r = v << 8;
        for (let u = 1; u < 255; u += 2) {
            map[r | u] = average(map[r | (u - 1)], map[r | (u + 1)]);
        }
        map[r | 255] = map[r | 254];
    }
    for (let v = 1; v < 255; v += 2) {
        const r = v << 8;
        for (let u = 0; u < 256; u++) {
            map[r | u] = average(map[(r - 256) | u], map[(r + 256) | u]);
        }
    }
    map.copyWithin(255 << 8, 254 << 8, 255 << 8);
}
