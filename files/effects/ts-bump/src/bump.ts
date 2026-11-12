/*
 * @file    bump.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   2D Bump Mapping effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Point2D } from "library/core/interfaces";

import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";

import { Surface } from "library/gfx/surface";
import { applyPalette, redChannel } from "library/gfx/pixels";

//----- globals
export const SPOT_SIZE = 512; // light spot (environment map) size
const SPOT_RADIUS = 256; // light spot radius
const BLUR_PASSES = 8; // height map smoothing (rounded letters)
const LIGHT_SPEED = 0.0024; // light path speed (radians per frame)
const DEPTH = 2; // relief depth (slope multiplier)

//----- functions
// heights from the height map image (grey: red channel), which must have the screen size
export function heights(image: Surface, w: number, h: number): Uint8Array {
    return redChannel(image, w, h, "Height map");
}

/* blur a height map (box blur 3x3, repeated)
 *
 * Args:
 *      map    : heights (w * h)
 *      w, h   : map size
 *      passes : number of blur passes
 */
export function blur(map: Uint8Array, w: number, h: number, passes: number): Uint8Array {
    let src = map.slice();
    let dst = map.slice();

    for (let p = 0; p < passes; p++) {
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                const sum =
                    src[i - w - 1] +
                    src[i - w] +
                    src[i - w + 1] +
                    src[i - 1] +
                    src[i] +
                    src[i + 1] +
                    src[i + w - 1] +
                    src[i + w] +
                    src[i + w + 1];
                dst[i] = Math.round(sum / 9);
            }
        }
        [src, dst] = [dst, src];
    }

    return src;
}

/* compute the slopes of a height map (borders are flat)
 *
 * Returns:
 *      nx : h(x+1) - h(x-1)
 *      ny : h(y+1) - h(y-1)
 */
export function slopes(map: Uint8Array, w: number, h: number): { nx: Int16Array; ny: Int16Array } {
    const nx = new Int16Array(w * h);
    const ny = new Int16Array(w * h);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            nx[i] = map[i + 1] - map[i - 1];
            ny[i] = map[i + w] - map[i - w];
        }
    }

    return { nx, ny };
}

// light spot: intensity decreasing with the distance to the centre
export function lightSpot(): Uint8Array {
    const spot = new Uint8Array(SPOT_SIZE * SPOT_SIZE);
    const c = SPOT_SIZE >> 1;

    for (let y = 0; y < SPOT_SIZE; y++) {
        for (let x = 0; x < SPOT_SIZE; x++) {
            const d = Math.hypot(x - c, y - c) / SPOT_RADIUS;
            const v = d < 1 ? 1 - d : 0;
            spot[y * SPOT_SIZE + x] = Math.round(255 * v * v);
        }
    }

    return spot;
}

// light position for a frame: slow Lissajous curve over the screen
export function lightPath(frame: number, w: number, h: number): Point2D {
    const t = frame * LIGHT_SPEED;
    return {
        x: Math.floor(w / 2 + (w / 2 - 20) * Math.sin(3 * t)),
        y: Math.floor(h / 2 + (h / 2 - 20) * Math.sin(2 * t + Math.PI / 4)),
    };
}

/* shade the height map with a light at (lx, ly)
 *
 * Each pixel reads the light spot at its distance to the light, moved by its slope:
 * a surface facing the light reads closer to the centre of the spot (brighter).
 *
 * Args:
 *      nx, ny : slopes (see slopes())
 *      spot   : light spot (see lightSpot())
 *      lx, ly : light position
 *      w, h   : map size
 *      out    : intensities (w * h), the 1-pixel border is black
 */
export function shade(
    nx: Int16Array,
    ny: Int16Array,
    spot: Uint8Array,
    lx: number,
    ly: number,
    w: number,
    h: number,
    out: Uint8Array,
): void {
    const c = SPOT_SIZE >> 1;
    out.fill(0);

    for (let y = 1; y < h - 1; y++) {
        const dy = y - ly + c;

        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            const u = x - lx + c - nx[i];
            const v = dy - ny[i];

            out[i] = u >= 0 && u < SPOT_SIZE && v >= 0 && v < SPOT_SIZE ? spot[v * SPOT_SIZE + u] : 0;
        }
    }
}

//----- class
export class Bump extends IAnimation {
    //----- members
    private image_: Surface; // height map image
    private nx_: Int16Array; // horizontal slopes
    private ny_: Int16Array; // vertical slopes
    private spot_: Uint8Array; // light spot
    private light_: Uint8Array; // light intensity per pixel
    private palette_: Palette;

    //----- methods
    constructor(display: Display) {
        super("bump", display);

        // set the vars
        const size = this.width_ * this.height_;
        this.image_ = new Surface();
        this.nx_ = new Int16Array(size);
        this.ny_ = new Int16Array(size);
        this.spot_ = lightSpot();
        this.light_ = new Uint8Array(size);
        this.palette_ = new Palette();

        this.createPalette();
    }

    // palette: black -> deep blue -> light blue -> white
    private createPalette(): void {
        for (let i = 0; i < 256; i++) {
            const r = i < 128 ? 0 : (i - 128) * 2;
            const g = i < 64 ? 0 : Math.min(255, (i - 64) * 1.4);
            const b = Math.min(255, i * 2);
            this.palette_.setColor(i, Color.from(new RGBA(r, Math.floor(g), b)));
        }
    }

    // load the height map and compute its slopes
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-bump.heightmap.png").then(() => {
            const w = this.width_;
            const h = this.height_;

            // brightness is the height; |slope| <= 2 * 255 * DEPTH must fit in an Int16
            const map = heights(this.image_, w, h);
            const { nx, ny } = slopes(blur(map, w, h, BLUR_PASSES), w, h);
            for (let i = 0; i < nx.length; i++) {
                nx[i] *= DEPTH;
                ny[i] *= DEPTH;
            }
            this.nx_ = nx;
            this.ny_ = ny;
        });
    }

    // update the animation
    protected update(): void {
        const light = lightPath(this.frames_, this.width_, this.height_);
        shade(this.nx_, this.ny_, this.spot_, light.x, light.y, this.width_, this.height_, this.light_);
    }

    // render the animation on screen
    protected render(): void {
        applyPalette(this.light_, this.palette_.toUint32Array(), this.display_.surface.data32);

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
