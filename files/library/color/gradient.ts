/*
 * @file    gradient.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Colour gradients on plain [r, g, b] triples
 */

//----- imports
import { RGBA } from "./RGBA";

//----- functions

/* linear mix of two colours, each channel rounded
 *
 * Args:
 *      a, b : colours ([r, g, b], 0..255)
 *      t    : 0 gives a, 1 gives b
 */
export function mixRGB(a: number[], b: number[], t: number): number[] {
    return a.map((v, k) => Math.round(v + (b[k] - v) * t));
}

/* vertical gradient, one colour per row (w * h packed pixels, opaque)
 *
 * Args:
 *      w, h        : size
 *      top, bottom : colours of the first and last rows ([r, g, b])
 */
export function verticalGradient(w: number, h: number, top: number[], bottom: number[]): Uint32Array {
    const out = new Uint32Array(w * h);

    for (let y = 0; y < h; y++) {
        const [r, g, b] = mixRGB(top, bottom, y / (h - 1));
        out.fill(RGBA.toUInt32(r, g, b), y * w, (y + 1) * w);
    }

    return out;
}
