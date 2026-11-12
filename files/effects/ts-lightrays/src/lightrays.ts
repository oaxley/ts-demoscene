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
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";
import { mixRGB } from "library/color/gradient";
import { Surface } from "library/gfx/surface";

//----- globals
export const FPS = 25;

// light path
const SWEEP = (2 * Math.PI) / (12 * FPS); // one full sweep (left -> right -> left) in 12 s
const DRIFT = 40; // vertical drift around the screen centre (pixels)

// rays (half-size buffer)
const GLOW_RADIUS = 80; // radius of the light glow (half-size pixels)
const AMBIENT = 14; // dim light everywhere, so far gaps still catch some rays
const SAMPLES = 24; // samples along the line to the light
const DENSITY = 0.9; // fraction of the distance to the light covered by the samples
const DECAY = 0.985; // weight of a sample relative to the previous one

// colours
const BACKGROUND = [0x05, 0x06, 0x0f]; // near-black blue
const ORANGE = [0xff, 0x78, 0x14];
const WHITE = [0xff, 0xf0, 0xd2]; // warm white
const LETTER = RGBA.toUInt32(0x0a, 0x0a, 0x0e);
const EXPOSURE = 1.6; // ray brightness multiplier

// 4x4 ordered dither: start offset of the samples, hides the steps between them
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

//----- functions

/* text mask from the mask image (red channel > 127 = letter), which must have the screen size
 *
 * Returns:
 *      1 for a letter pixel, 0 otherwise
 */
export function maskFrom(image: Surface, w: number, h: number): Uint8Array {
    if (image.width !== w || image.height !== h) {
        throw new Error(`Mask is ${image.width}x${image.height}, expected ${w}x${h}.`);
    }
    const pixels = image.data32;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
        mask[i] = (pixels[i] & 0xff) > 127 ? 1 : 0;
    }
    return mask;
}

// palette: background -> orange -> warm white
function palette(): Uint32Array {
    const lut = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        const c = t < 0.6 ? mixRGB(BACKGROUND, ORANGE, t / 0.6) : mixRGB(ORANGE, WHITE, (t - 0.6) / 0.4);
        lut[i] = RGBA.toUInt32(c[0], c[1], c[2]);
    }
    return lut;
}

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
            out[i] = Math.min(255, AMBIENT + (255 - AMBIENT) * g * g * g);
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
    const inside = lx >= 0 && lx <= xmax && ly >= 0 && ly <= ymax;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // step toward the light
            const sx = ((lx - x) * DENSITY) / SAMPLES;
            const sy = ((ly - y) * DENSITY) / SAMPLES;
            const jitter = BAYER[((y & 3) << 2) | (x & 3)];
            let px = x + 0.5 + sx * jitter;
            let py = y + 0.5 + sy * jitter;
            let sum = 0;
            if (inside) {
                // the light is in the buffer: every sample is too (segment inside a rectangle)
                for (let k = 0; k < SAMPLES; k++) {
                    sum += src[(py | 0) * w + (px | 0)] * weights[k];
                    px += sx;
                    py += sy;
                }
            } else {
                for (let k = 0; k < SAMPLES; k++) {
                    const ix = px < 0 ? 0 : px > xmax ? xmax : px | 0;
                    const iy = py < 0 ? 0 : py > ymax ? ymax : py | 0;
                    sum += src[iy * w + ix] * weights[k];
                    px += sx;
                    py += sy;
                }
            }
            out[y * w + x] = Math.min(255, Math.round(sum));
        }
    }
}

//----- class
export class LightRays extends IAnimation {
    //----- members
    private image_: Surface; // mask image
    private mask_: Uint8Array; // full-size mask (1 = letter)
    private half_: Uint8Array; // half-size mask
    private light_: Uint8Array; // light that gets through (half size)
    private rays_: Uint8Array; // rays after the radial blur (half size)
    private lut_: Uint32Array; // palette

    //----- methods
    constructor(display: Display) {
        super("lightrays", display, FPS);

        const size = (display.width >> 1) * (display.height >> 1);
        this.image_ = new Surface();
        this.mask_ = new Uint8Array(display.width * display.height);
        this.half_ = new Uint8Array(size);
        this.light_ = new Uint8Array(size);
        this.rays_ = new Uint8Array(size);
        this.lut_ = palette();
    }

    // load the text mask
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-lightrays.mask.png").then(() => {
            this.mask_ = maskFrom(this.image_, this.width_, this.height_);
            this.half_ = downsample(this.mask_, this.width_, this.height_);
        });
    }

    // update the animation
    protected update(): void {
        const w = this.width_ >> 1;
        const h = this.height_ >> 1;
        const light = lightPath(this.frames_, this.width_, this.height_);
        occlusion(this.half_, w, h, light.x / 2, light.y / 2, this.light_);
        radialBlur(this.light_, w, h, light.x / 2, light.y / 2, this.rays_);
    }

    // render the animation on screen: upscaled rays, then the letters on top
    protected render(): void {
        const W = this.width_;
        const H = this.height_;
        const hw = W >> 1;
        const hh = H >> 1;
        const rays = this.rays_;
        const mask = this.mask_;
        const lut = this.lut_;
        const dst = this.display_.surface.data32;

        for (let y = 0; y < H; y++) {
            // bilinear upscale: half-size sample centres at (2x+0.5, 2y+0.5)
            const fy = Math.min(Math.max((y - 0.5) / 2, 0), hh - 1);
            const y0 = Math.min(fy | 0, hh - 2);
            const ty = fy - y0;
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (mask[i]) {
                    dst[i] = LETTER;
                    continue;
                }
                const fx = Math.min(Math.max((x - 0.5) / 2, 0), hw - 1);
                const x0 = Math.min(fx | 0, hw - 2);
                const tx = fx - x0;
                const j = y0 * hw + x0;
                const top = rays[j] + (rays[j + 1] - rays[j]) * tx;
                const bottom = rays[j + hw] + (rays[j + hw + 1] - rays[j + hw]) * tx;
                const v = (top + (bottom - top) * ty) * EXPOSURE;
                dst[i] = lut[v >= 255 ? 255 : v | 0];
            }
        }

        this.display_.draw();
    }
}
