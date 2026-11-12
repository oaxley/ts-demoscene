/*
 * @file    pixels.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Whole-buffer pixel helpers (packed ABGR pixels, same layout as Surface.data32)
 *
 *          Each helper loops over the whole buffer itself: no function call per pixel.
 */

//----- imports
import { Surface } from "./surface";

//----- globals
// 4x4 ordered dithering thresholds, in [0, 1) (add before truncating to hide banding)
export const BAYER4: number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

//----- functions

/* palette lookup of a whole buffer: dst[i] = lut[src[i]]
 *
 * Args:
 *      src : palette indexes
 *      lut : packed colours (see Palette.toUint32Array)
 *      dst : destination pixels (at least src.length)
 */
export function applyPalette(src: ArrayLike<number>, lut: Uint32Array, dst: Uint32Array): void {
    const n = src.length;
    for (let i = 0; i < n; i++) {
        dst[i] = lut[src[i]];
    }
}

/* move every pixel toward a colour: p + (color - p) * a / 256, per channel, alpha forced to 0xff
 *
 * Args:
 *      dst   : pixels (updated)
 *      color : target colour (its alpha byte is ignored)
 *      a     : amount in 8-bit fixed point (0 = unchanged, 256 = the colour)
 */
export function fadeToColor(dst: Uint32Array, color: number, a: number): void {
    const cr = color & 0xff;
    const cg = (color >>> 8) & 0xff;
    const cb = (color >>> 16) & 0xff;
    for (let i = 0; i < dst.length; i++) {
        const d = dst[i];
        const r = d & 0xff;
        const g = (d >>> 8) & 0xff;
        const b = (d >>> 16) & 0xff;
        dst[i] =
            (0xff000000 |
                ((b + (((cb - b) * a) >> 8)) << 16) |
                ((g + (((cg - g) * a) >> 8)) << 8) |
                (r + (((cr - r) * a) >> 8))) >>>
            0;
    }
}

/* blend every pixel over a base buffer: base + (dst - base) * k / 256, per channel, opaque
 *
 * Args:
 *      dst  : pixels (updated)
 *      base : pixels shown when k = 0 (same length as dst)
 *      k    : weight of dst in 8-bit fixed point (0 = base, 256 = unchanged)
 */
export function mixToBuffer(dst: Uint32Array, base: Uint32Array, k: number): void {
    for (let i = 0; i < dst.length; i++) {
        const p = dst[i];
        const q = base[i];
        const r = (q & 0xff) + ((((p & 0xff) - (q & 0xff)) * k) >> 8);
        const g = ((q >> 8) & 0xff) + (((((p >> 8) & 0xff) - ((q >> 8) & 0xff)) * k) >> 8);
        const b = ((q >> 16) & 0xff) + (((((p >> 16) & 0xff) - ((q >> 16) & 0xff)) * k) >> 8);
        dst[i] = (0xff000000 | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff)) >>> 0;
    }
}

/* red channel of an image which must have a given size (grey maps, masks)
 *
 * Args:
 *      image : the image
 *      w, h  : expected size
 *      what  : name of the image in the error message
 */
export function redChannel(image: Surface, w: number, h: number, what: string): Uint8Array {
    if (image.width !== w || image.height !== h) {
        throw new Error(`${what} is ${image.width}x${image.height}, expected ${w}x${h}.`);
    }

    const pixels = image.data32;
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) {
        out[i] = pixels[i] & 0xff;
    }

    return out;
}
