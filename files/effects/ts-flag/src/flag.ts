/*
 * @file    flag.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   The flag of Canada in the wind: a 3D Verlet cloth drawn with textured cells
 *
 *          Timeline (frames): the flag is shown still, then falls from its free side (the left
 *          side is attached to an invisible pole) and hangs, until a gusty wind from the left
 *          lifts it and makes it wave. Then it fades out and everything starts again.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";

import { verticalGradient } from "library/color/gradient";

import { Surface } from "library/gfx/surface";
import { mixToBuffer } from "library/gfx/pixels";
import { TEXTURE_SIZE, TexVertex, drawTexturedPolygon, isTextureReady, loadTexture } from "library/gfx/texture";
import { lambert, LIGHT_TOP_LEFT } from "library/maths/mesh";
import { Noise } from "library/maths/noise";

import { Cloth, Wind } from "./cloth";

//----- globals
export const FPS = 25; // fixed frame rate: the timeline is counted in frames

// timeline (frames)
export const STILL_FRAMES = 75; // flat and still
export const FALL_FRAMES = 75; // gravity only: the free side falls
export const RAMP_FRAMES = 50; // the wind rises
export const WIND_FRAMES = 750; // the wind blows in gusts
export const FADE_FRAMES = 25; // fade out (also used to fade in at the start)
export const CYCLE_FRAMES = STILL_FRAMES + FALL_FRAMES + RAMP_FRAMES + WIND_FRAMES + FADE_FRAMES;

// cloth (world space: x right, y down, z away from the camera)
const COLS = 32;
const ROWS = 16;
const SPACING = 9; // distance between two points: the flag is 279 x 135
const POLE_X = -140; // top of the pole (the hanging flag stays on screen)
const POLE_Y = -120;
const GRAVITY = 0.5; // per frame^2

// wind: along +x, a little toward the back so the cloth leaves its plane
const WIND_SEED = 1965; // the year the flag was adopted
const WIND_BASE = 1.2; // steady part of the wind
const WIND_GUST = 2.0; // gusts on top of it (noise in [0, 1))
const WIND_Z = 0.3; // z part of the wind (fraction of x)
const NOISE_SPEED = 0.03; // gust changes per frame

// camera
export const ZOOM = 600; // projection: x * ZOOM / (z + DEPTH)
export const DEPTH = 500; // distance from the camera to the cloth plane
export const NEAR = 50; // nothing is projected closer than this
const YAW = 0.25; // camera turned around y (radians): shows the depth of the waves
const COS_YAW = Math.cos(YAW);
const SIN_YAW = Math.sin(YAW);
const SHIFT_X = 0; // flag position on screen (camera space offset)
const SHIFT_Y = 0;

// light: LIGHT_TOP_LEFT (top-left-front)
const AMBIENT = 0.35; // minimum brightness
const DIFFUSE = 0.65; // brightness added by the light

const SKY_TOP: [number, number, number] = [24, 64, 140]; // background gradient: blue at the top ...
const SKY_BOTTOM: [number, number, number] = [150, 190, 230]; // ... pale at the bottom

//----- functions
/* the wind for a frame of the cycle
 *
 * Args:
 *      frame : frame in the cycle (0 .. CYCLE_FRAMES - 1)
 *      noise : gusts generator
 */
export function windAt(frame: number, noise: Noise.Noise1D): Wind {
    const start = STILL_FRAMES + FALL_FRAMES;
    if (frame < start) {
        return { x: 0, y: 0, z: 0 };
    }

    const ramp = Math.min(1, (frame - start + 1) / RAMP_FRAMES);
    const x = ramp * (WIND_BASE + WIND_GUST * noise.eval(frame * NOISE_SPEED));
    return { x, y: 0, z: x * WIND_Z };
}

// brightness of cell (c, r): AMBIENT + DIFFUSE * |n.L| (both sides of the cloth are lit)
export function cellShade(cloth: Cloth, c: number, r: number): number {
    const p = cloth.pos;
    const i00 = (r * cloth.cols + c) * 3;
    const i10 = i00 + 3;
    const i01 = i00 + cloth.cols * 3;
    const i11 = i01 + 3;

    // normal = cross product of the diagonals
    const ax = p[i11] - p[i00];
    const ay = p[i11 + 1] - p[i00 + 1];
    const az = p[i11 + 2] - p[i00 + 2];
    const bx = p[i01] - p[i10];
    const by = p[i01 + 1] - p[i10 + 1];
    const bz = p[i01 + 2] - p[i10 + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    if (nx === 0 && ny === 0 && nz === 0) {
        return AMBIENT;
    }

    return lambert(nx, ny, nz, LIGHT_TOP_LEFT, AMBIENT, DIFFUSE, true);
}

// =true when the 4 projected corners make a convex polygon (all turns on the same side)
export function isConvex(q: TexVertex[]): boolean {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
        const a = q[i];
        const b = q[(i + 1) & 3];
        const c = q[(i + 2) & 3];
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        if (cross === 0) continue;
        const s = cross > 0 ? 1 : -1;
        if (sign !== 0 && s !== sign) {
            return false;
        }
        sign = s;
    }
    return true;
}

/* the 4 projected corners of cell (c, r): (c, r), (c+1, r), (c+1, r+1), (c, r+1)
 *
 * Args:
 *      cloth  : the cloth
 *      c, r   : cell (top-left point)
 *      out    : 4 vertices (written)
 *      cx, cy : screen centre
 */
export function buildQuad(cloth: Cloth, c: number, r: number, out: TexVertex[], cx: number, cy: number): void {
    const p = cloth.pos;
    const ku = TEXTURE_SIZE / (cloth.cols - 1);
    const kv = TEXTURE_SIZE / (cloth.rows - 1);

    for (let k = 0; k < 4; k++) {
        const pc = c + (k === 1 || k === 2 ? 1 : 0);
        const pr = r + (k >= 2 ? 1 : 0);
        const i = (pr * cloth.cols + pc) * 3;

        // camera turned around y
        const x = p[i] * COS_YAW - p[i + 2] * SIN_YAW;
        const z = Math.max(p[i] * SIN_YAW + p[i + 2] * COS_YAW + DEPTH, NEAR);
        const s = ZOOM / z;

        const v = out[k];
        v.x = cx + (x + SHIFT_X) * s;
        v.y = cy + (p[i + 1] + SHIFT_Y) * s;
        v.z = z;
        v.u = pc * ku;
        v.v = pr * kv;
    }
}

//----- class
export class Flag extends IAnimation {
    //----- members
    private texture_: Surface; // the flag image
    private background_: Uint32Array; // vertical gradient
    private noise_: Noise.Noise1D; // wind gusts
    private cloth_: Cloth; // the simulation

    private quad_: TexVertex[]; // a cell given to the filler
    private tri_: TexVertex[]; // half of a non-convex cell
    private order_: Uint16Array; // cells sorted back to front
    private depth_: Float64Array; // mean depth of each cell

    //----- methods
    constructor(display: Display) {
        super("flag", display, FPS);

        this.texture_ = new Surface();
        this.background_ = verticalGradient(this.width_, this.height_, SKY_TOP, SKY_BOTTOM);
        this.noise_ = new Noise.Noise1D(WIND_SEED);
        this.cloth_ = new Cloth(COLS, ROWS, SPACING, { x: POLE_X, y: POLE_Y, z: 0 });

        const cells = (COLS - 1) * (ROWS - 1);
        this.quad_ = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, z: 0, u: 0, v: 0 }));
        this.tri_ = [];
        this.order_ = new Uint16Array(cells);
        this.depth_ = new Float64Array(cells);
        for (let i = 0; i < cells; i++) {
            this.order_[i] = i;
        }
    }

    // load the flag image, which must be TEXTURE_SIZE x TEXTURE_SIZE
    protected init(): Promise<unknown> {
        return loadTexture(this.texture_, "/images/assets/ts-flag.flag.png");
    }

    // update the animation: one step of the cloth
    protected update(): void {
        const frame = this.frames_ % CYCLE_FRAMES;
        if (frame === 0) {
            this.cloth_.reset();
        }
        if (frame >= STILL_FRAMES) {
            this.cloth_.step(GRAVITY, windAt(frame, this.noise_));
        }
    }

    // render the animation on screen
    protected render(): void {
        const dst = this.display_.surface.data32;
        dst.set(this.background_);

        // texture not loaded yet: background only
        if (isTextureReady(this.texture_)) {
            this.drawCloth(dst);
        }

        // fade in at the start of the cycle, out at the end
        const frame = this.frames_ % CYCLE_FRAMES;
        const fade = Math.min(frame + 1, CYCLE_FRAMES - frame) / FADE_FRAMES;
        if (fade < 1) {
            mixToBuffer(dst, this.background_, Math.round(Math.max(0, fade) * 256));
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }

    // draw the cells of the cloth, from the farthest to the nearest
    private drawCloth(dst: Uint32Array): void {
        const cloth = this.cloth_;
        const pos = cloth.pos;
        const order = this.order_;
        const depth = this.depth_;
        const cells = order.length;
        const w = COLS - 1;

        // mean depth of each cell (camera space, the 4 corners)
        for (let k = 0; k < cells; k++) {
            const i = ((((k / w) | 0) * COLS + (k % w)) * 3) | 0;
            const j = i + COLS * 3;
            const x = pos[i] + pos[i + 3] + pos[j] + pos[j + 3];
            const z = pos[i + 2] + pos[i + 5] + pos[j + 2] + pos[j + 5];
            depth[k] = x * SIN_YAW + z * COS_YAW;
        }

        // insertion sort, deepest first (the order hardly changes from one frame to the next)
        for (let a = 1; a < cells; a++) {
            const cell = order[a];
            const d = depth[cell];
            let b = a - 1;
            while (b >= 0 && depth[order[b]] < d) {
                order[b + 1] = order[b];
                b--;
            }
            order[b + 1] = cell;
        }

        const texture = this.texture_.data32;
        const quad = this.quad_;
        const tri = this.tri_;
        const cx = this.width_ >> 1;
        const cy = this.height_ >> 1;
        for (let k = 0; k < cells; k++) {
            const c = order[k] % w;
            const r = (order[k] / w) | 0;
            buildQuad(cloth, c, r, quad, cx, cy);
            const shade = cellShade(cloth, c, r);

            if (isConvex(quad)) {
                drawTexturedPolygon(dst, this.width_, this.height_, quad, texture, shade);
            } else {
                // folded cell: two triangles
                tri[0] = quad[0];
                tri[1] = quad[1];
                tri[2] = quad[2];
                drawTexturedPolygon(dst, this.width_, this.height_, tri, texture, shade);
                tri[1] = quad[2];
                tri[2] = quad[3];
                drawTexturedPolygon(dst, this.width_, this.height_, tri, texture, shade);
            }
        }
    }
}
