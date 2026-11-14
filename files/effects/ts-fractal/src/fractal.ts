/*
 * @file    fractal.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Mandelbrot infinite zoom from pre-rendered keyframes
 *
 *          The keyframes (scripts/fractal-keyframes.mts) hold a palette index
 *          per pixel. At zoom level z = k + f, keyframe k is drawn scaled and
 *          turned around the pivot, and keyframe k+1 is blended in where it
 *          covers the screen. The palette slowly shifts so that the last
 *          keyframe (a mini-Mandelbrot) gets the colours of the first one, then
 *          a crossfade loops the animation back to the start.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";

import { KEYFRAMES, keyframeUrl } from "./keyframes";
import { TIMELINE, Phase, phaseAt, colourShift, paletteIndex, screenToKeyframe, nextKeyframe } from "./zoom";

//----- globals
const FPS = 60;
const INSIDE = [0, 0, 0];

// exterior palette: smooth loop through these colours (255 entries)
const GRADIENT = [
    [8, 10, 40],
    [30, 80, 170],
    [120, 200, 230],
    [250, 250, 210],
    [240, 170, 40],
    [160, 50, 20],
    [60, 10, 50],
];

//----- functions

// build the 256 colours (index 0 = inside the set)
function buildPalette(): number[][] {
    const pal = [INSIDE];
    const n = GRADIENT.length;
    for (let i = 0; i < 255; i++) {
        const t = (i / 255) * n;
        const a = GRADIENT[Math.floor(t) % n];
        const b = GRADIENT[(Math.floor(t) + 1) % n];
        const u = t - Math.floor(t);
        const s = u * u * (3 - 2 * u);
        pal.push([0, 1, 2].map((c) => a[c] + (b[c] - a[c]) * s));
    }
    return pal;
}

//----- class
export class Fractal extends IAnimation {
    //----- members
    private keyframes_: Uint8Array[]; // palette indices of every keyframe
    private palette_: number[][]; // RGB colours
    private colours_: Uint32Array[]; // shifted palettes: [current / first keyframe, last keyframe]
    private phase_: Phase;

    //----- methods
    constructor(display: Display) {
        super("fractal", display, FPS);

        this.keyframes_ = [];
        this.palette_ = buildPalette();
        this.colours_ = [new Uint32Array(256), new Uint32Array(256)];
        this.phase_ = { z: 0, fade: 0 };
    }

    // load the keyframes, keep one byte (palette index) per pixel
    protected init(): Promise<unknown> {
        const loads = [];
        for (let i = 0; i < KEYFRAMES.count; i++) {
            const surface = new Surface();
            loads.push(
                surface.loadImage(keyframeUrl(i)).then((ok) => {
                    if (!ok || surface.width !== KEYFRAMES.width || surface.height !== KEYFRAMES.height) {
                        throw new Error(`ts-fractal: bad keyframe ${keyframeUrl(i)}`);
                    }
                    const rgba = surface.data8;
                    const index = new Uint8Array(surface.width * surface.height);
                    for (let p = 0; p < index.length; p++) {
                        index[p] = rgba[p * 4];
                    }
                    this.keyframes_[i] = index;
                }),
            );
        }
        return Promise.all(loads);
    }

    // fill a 32-bit palette shifted by `shift` colours
    private shiftPalette(out: Uint32Array, shift: number): void {
        for (let v = 0; v < 256; v++) {
            const c = this.palette_[paletteIndex(v, shift)];
            out[v] = RGBA.toUInt32(c[0], c[1], c[2]);
        }
    }

    // update the animation
    protected update(): void {
        this.phase_ = phaseAt(this.frames_, TIMELINE, KEYFRAMES.count - 1);
    }

    // draw the zoom
    protected render(): void {
        const { z, fade } = this.phase_;
        const last = KEYFRAMES.count - 1;

        if (fade > 0) {
            this.renderFade(fade);
        } else {
            const k = Math.min(Math.floor(z), last - 1);
            const f = z - k;
            const shift = colourShift(z, KEYFRAMES);
            this.shiftPalette(this.colours_[0], shift);
            this.renderLevel(k, f);
        }

        this.display_.draw();
    }

    /* keyframe k at zoom fraction f, keyframe k+1 blended with weight f
     *
     * Both keyframes are walked incrementally along each screen line.
     */
    private renderLevel(k: number, f: number): void {
        const out = this.display_.surface.data32;
        const pal = this.colours_[0];
        const w = this.width_;
        const kw = KEYFRAMES.width;
        const kh = KEYFRAMES.height;
        const src = this.keyframes_[k];
        const next = this.keyframes_[k + 1];

        // screen steps in keyframe k and k+1
        const [ox, oy] = screenToKeyframe(0, 0, f, KEYFRAMES, w);
        const [xx, xy] = screenToKeyframe(1, 0, f, KEYFRAMES, w);
        const [yx, yy] = screenToKeyframe(0, 1, f, KEYFRAMES, w);
        const [nox, noy] = nextKeyframe(ox, oy, KEYFRAMES);
        const [nxx, nxy] = nextKeyframe(xx, xy, KEYFRAMES);
        const [nyx, nyy] = nextKeyframe(yx, yy, KEYFRAMES);

        const dxx = xx - ox;
        const dxy = xy - oy;
        const dyx = yx - ox;
        const dyy = yy - oy;
        const ndxx = nxx - nox;
        const ndxy = nxy - noy;
        const ndyx = nyx - nox;
        const ndyy = nyy - noy;
        const mix = Math.round(f * 256);
        const keep = 256 - mix;

        let addr = 0;
        for (let y = 0; y < this.height_; y++) {
            let px = ox + y * dyx + 0.5;
            let py = oy + y * dyy + 0.5;
            let nx = nox + y * ndyx + 0.5;
            let ny = noy + y * ndyy + 0.5;
            for (let x = 0; x < w; x++, addr++) {
                const a = pal[src[(py | 0) * kw + (px | 0)]];
                if (nx >= 0 && ny >= 0 && nx < kw && ny < kh && mix > 0) {
                    const b = pal[next[(ny | 0) * kw + (nx | 0)]];
                    out[addr] =
                        0xff000000 |
                        ((((a & 0xff00ff) * keep + (b & 0xff00ff) * mix) >>> 8) & 0xff00ff) |
                        ((((a & 0xff00) * keep + (b & 0xff00) * mix) >>> 8) & 0xff00);
                } else {
                    out[addr] = a;
                }
                px += dxx;
                py += dxy;
                nx += ndxx;
                ny += ndxy;
            }
        }
    }

    // crossfade from the last keyframe back to the first, at the same scale
    private renderFade(fade: number): void {
        const out = this.display_.surface.data32;
        const first = this.colours_[0];
        const last = this.colours_[1];
        const kf = this.keyframes_;
        const w = this.width_;
        const kw = KEYFRAMES.width;
        const step = kw / w;
        const mix = Math.round(fade * 256);
        const keep = 256 - mix;

        this.shiftPalette(last, colourShift(KEYFRAMES.count - 1, KEYFRAMES));
        this.shiftPalette(first, 0);

        const a0 = kf[KEYFRAMES.count - 1];
        const b0 = kf[0];
        let addr = 0;
        for (let y = 0; y < this.height_; y++) {
            const row = Math.floor((y + 0.5) * step) * kw;
            for (let x = 0; x < w; x++, addr++) {
                const i = row + Math.floor((x + 0.5) * step);
                const a = last[a0[i]];
                const b = first[b0[i]];
                out[addr] =
                    0xff000000 |
                    ((((a & 0xff00ff) * keep + (b & 0xff00ff) * mix) >>> 8) & 0xff00ff) |
                    ((((a & 0xff00) * keep + (b & 0xff00) * mix) >>> 8) & 0xff00);
            }
        }
    }
}
