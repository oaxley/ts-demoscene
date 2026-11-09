/*
 * @file    lightrays.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Light Rays effect: a light sweeping behind a dark word, its rays streaming through the letters
 *
 * Screen-space light scattering ("god rays"): the light that gets through the
 * text is drawn in a small buffer, then smeared outward from the light.
 */

//----- imports
import { Point2D } from "library/core/interfaces";

//----- globals
export const FPS = 25;

// light path
const SWEEP = (2 * Math.PI) / (8 * FPS); // one full sweep (left -> right -> left) in 8 s
const DRIFT = 40; // vertical drift around the screen centre (pixels)

// rays (half-size buffer)
const GLOW_RADIUS = 140; // radius of the light glow (half-size pixels)
const AMBIENT = 18; // dim light everywhere, so far gaps still catch some rays
const SAMPLES = 24; // samples along the line to the light
const DENSITY = 0.9; // fraction of the distance to the light covered by the samples
const DECAY = 0.94; // weight of a sample relative to the previous one

//----- functions

/* position of the light (screen pixels): a pendulum across the screen, with a slow vertical drift
 *
 * Args:
 *      frame: frame number
 *      w, h : screen size
 */
export function lightPath(frame: number, w: number, h: number): Point2D {
    const t = frame * SWEEP;
    return {
        x: w / 2 + (w / 2 + 40) * Math.sin(t),
        y: h / 2 + DRIFT * Math.sin(t * 1.7),
    };
}

/* half-size mask: a cell is a letter when any of its 4 source pixels is
 *
 * Args:
 *      mask: full-size mask (1 = letter)
 *      w, h: full size (even)
 */
export function downsample(mask: Uint8Array, w: number, h: number): Uint8Array {
    const hw = w >> 1;
    const hh = h >> 1;
    const out = new Uint8Array(hw * hh);
    for (let y = 0; y < hh; y++) {
        for (let x = 0; x < hw; x++) {
            const i = 2 * y * w + 2 * x;
            out[y * hw + x] = mask[i] | mask[i + 1] | mask[i + w] | mask[i + w + 1];
        }
    }
    return out;
}

/* light that gets through the text: the glow of the light, zero on the letters
 *
 * Args:
 *      mask  : mask (1 = letter), w * h
 *      w, h  : buffer size
 *      lx, ly: light position (buffer pixels)
 *      out   : result, w * h
 */
export function occlusion(mask: Uint8Array, w: number, h: number, lx: number, ly: number, out: Uint8Array): void {
    for (let y = 0; y < h; y++) {
        const dy = y - ly;
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (mask[i]) {
                out[i] = 0;
                continue;
            }
            const dx = x - lx;
            const g = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / GLOW_RADIUS);
            out[i] = Math.min(255, AMBIENT + (255 - AMBIENT) * g * g);
        }
    }
}

/* radial blur toward the light: each pixel averages the samples on the line to the light
 *
 * Args:
 *      src   : light that gets through, w * h
 *      w, h  : buffer size
 *      lx, ly: light position (buffer pixels, may be outside)
 *      out   : result in [0, 255], w * h
 */
export function radialBlur(src: Uint8Array, w: number, h: number, lx: number, ly: number, out: Uint8Array): void {
    // weights of the samples, normalised
    const weights = new Float64Array(SAMPLES);
    let total = 0;
    for (let k = 0; k < SAMPLES; k++) {
        weights[k] = Math.pow(DECAY, k);
        total += weights[k];
    }
    for (let k = 0; k < SAMPLES; k++) {
        weights[k] /= total;
    }

    const xmax = w - 1;
    const ymax = h - 1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // step toward the light
            const sx = ((lx - x) * DENSITY) / SAMPLES;
            const sy = ((ly - y) * DENSITY) / SAMPLES;
            let px = x + 0.5;
            let py = y + 0.5;
            let sum = 0;
            for (let k = 0; k < SAMPLES; k++) {
                const ix = px < 0 ? 0 : px > xmax ? xmax : px | 0;
                const iy = py < 0 ? 0 : py > ymax ? ymax : py | 0;
                sum += src[iy * w + ix] * weights[k];
                px += sx;
                py += sy;
            }
            out[y * w + x] = Math.min(255, Math.round(sum));
        }
    }
}
