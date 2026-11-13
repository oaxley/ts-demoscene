/*
 * @file    sky.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Sky with a cloud ceiling (ts-mirror)
 *
 *          The sky is a gradient: the zenith colour overhead, the horizon haze at the horizon
 *          (the colour the floor fades into, so floor and sky meet without a line).
 *
 *          The clouds lie on a flat ceiling, the plane y = CLOUD_Y above the camera: it is the
 *          floor turned upside down. A screen row above the horizon sees the ceiling at a constant
 *          depth z = -CLOUD_Y * ZOOM / (HORIZON - y), so the sky is drawn row by row like the
 *          floor. The clouds fade out with the distance (they melt into the gradient), and far away
 *          a pixel covers many texels, so the texture level is picked from the pixel footprint.
 */

//----- imports
import { RGBA } from "library/color/RGBA";

import { cloudTexture, sampleCloud, CloudTexture } from "./clouds";
import { HAZE, HAZE_COLOR, HORIZON, ZOOM } from "./floor";

//----- globals
export const CLOUD_Y = -300; // cloud ceiling height (camera space, y down: above the camera)
export const CLOUD_TEXEL = 8; // world units per cloud texel
export const CLOUD_FOG = 6000; // cloud visibility: exp(-distance / CLOUD_FOG)
export const CLOUD_SEED = 7; // the clouds are the same at every run
export const ZENITH: [number, number, number] = [40, 80, 160]; // sky colour straight up
export const CLOUD: [number, number, number] = [245, 245, 250]; // thick cloud colour

const SHADES = 32; // cloud density steps in a row colour table

let clouds: CloudTexture | undefined;

//----- functions

// the cloud texture, built on first use
export function getClouds(): CloudTexture {
    if (!clouds) {
        clouds = cloudTexture(CLOUD_SEED);
    }
    return clouds;
}

// share of the zenith colour for a view direction going up by `up` (0: horizon, 1: zenith)
function gradient(up: number): number {
    const t = 1 - (up < 0 ? 0 : up > 1 ? 1 : up);
    return 1 - t * t * t * t;
}

// sky colour: gradient g, cloud density c, cloud visibility f
function mix(g: number, c: number, f: number): number {
    const a = c * f;
    const b = 1 - a;
    return RGBA.toUInt32(
        Math.round((HAZE[0] + (ZENITH[0] - HAZE[0]) * g) * b + CLOUD[0] * a),
        Math.round((HAZE[1] + (ZENITH[1] - HAZE[1]) * g) * b + CLOUD[1] * a),
        Math.round((HAZE[2] + (ZENITH[2] - HAZE[2]) * g) * b + CLOUD[2] * a),
    );
}

/* colour of the sky seen through a point of the cloud ceiling
 *
 * Args:
 *      cx, cz : ceiling point (world units, the cloud scroll included)
 *      up     : upward share of the view direction (0: horizontal, 1: straight up)
 *      dist   : distance used to fade the clouds
 *      w      : footprint of the pixel on the ceiling (world units)
 */
export function skyColor(cx: number, cz: number, up: number, dist: number, w: number): number {
    if (!Number.isFinite(dist) || !Number.isFinite(cx) || !Number.isFinite(cz)) {
        return HAZE_COLOR;
    }
    const c = sampleCloud(getClouds(), cx / CLOUD_TEXEL, cz / CLOUD_TEXEL, w / CLOUD_TEXEL);
    return mix(gradient(up), c, Math.exp(-dist / CLOUD_FOG));
}

/* draw the sky (rows 0..HORIZON, the horizon row is the haze)
 *
 * Args:
 *      dst    : destination pixels (ABGR), width x height
 *      scroll : cloud offset along z (the clouds move toward the viewer)
 */
export function drawSky(dst: Uint32Array, width: number, height: number, scroll: number): void {
    const tex = getClouds();
    const half = width / 2;
    const h = -CLOUD_Y;
    const colors = new Uint32Array(SHADES + 1);
    const rows = Math.min(height, HORIZON);

    for (let y = 0; y < rows; y++) {
        // constant depth on the row: gradient, cloud visibility and footprint computed once
        const above = HORIZON - y;
        const z = (h * ZOOM) / above;
        const g = gradient(above / Math.hypot(above, ZOOM));
        const f = Math.exp(-z / CLOUD_FOG);
        for (let k = 0; k <= SHADES; k++) {
            colors[k] = mix(g, k / SHADES, f);
        }

        // the footprint of a pixel: one pixel wide, one row deep (the larger one)
        const dx = z / ZOOM;
        const w = Math.max(dx, (z * z) / (h * ZOOM)) / CLOUD_TEXEL;
        const tz = (z + scroll) / CLOUD_TEXEL;
        let tx = (-half * dx) / CLOUD_TEXEL;
        const step = dx / CLOUD_TEXEL;
        let p = y * width;
        for (let sx = 0; sx < width; sx++, tx += step) {
            dst[p++] = colors[Math.round(sampleCloud(tex, tx, tz, w) * SHADES)];
        }
    }
    if (height > HORIZON) {
        dst.fill(HAZE_COLOR, HORIZON * width, (HORIZON + 1) * width);
    }
}
