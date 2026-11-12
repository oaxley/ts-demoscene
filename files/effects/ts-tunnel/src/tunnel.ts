/*
 * @file    tunnel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Tunnel effect in Typescript
 *
 *          The camera flies inside a tube of radius 1 along the z axis. For each point of a
 *          coarse grid (one every GRID pixels) a ray is cast from the camera to the wall of the
 *          tube: it gives the texture coordinates (angle around the tube, depth) and the light
 *          (fog with the depth, glow at the end). Inside each grid block the values are
 *          interpolated, so the per-pixel work is only a texture lookup and a shade.
 *
 *          The camera drifts away from the axis (near walls move) and looks around (the end
 *          of the tunnel moves): the difference between both gives the depth and steering.
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";

//----- globals
export const TEX_SIZE = 256; // the texture is TEX_SIZE x TEX_SIZE (power of 2: wraps with a mask)
const TEX_MASK = TEX_SIZE - 1;
const TILE = TEX_SIZE >> 1; // source image tile, mirrored to make the texture seamless

const GRID = 8; // grid step (pixels)
const FOCAL = 0.5; // focal length, relative to the screen width (90 degrees field of view)

const U_AROUND = 3 * TEX_SIZE; // texels around the tube (the texture is repeated 3 times)
const V_UNIT = 40; // texels per unit of depth (the tube radius is 1)
const SPEED = 3; // flight speed (units per second)
const TWIST = 6; // rotation of the texture around the tube (texels per second)

const Z_MAX = 64; // ray length limit (rays along the axis never hit the wall)
const FOG = 4; // fog distance: the wall light is exp(-z / FOG)
const HAZE = 10; // haze distance: the glow at the end is GLOW * (1 - exp(-z / HAZE))^3
const GLOW = 30; // glow at the very end (per channel, 0..255): almost dark

// texel offset added before interpolating, so the coordinates stay positive (|0 = floor)
const BIAS = 2 * TEX_SIZE;

//----- functions

/* distance along a ray to the wall of the tube of radius 1 (in units of the ray direction)
 *
 * Args:
 *      ox, oy : camera position across the tube (inside: ox² + oy² < 1)
 *      dx, dy : ray direction across the tube
 *
 * Returns:
 *      t such that |(ox, oy) + t * (dx, dy)| = 1, Infinity for a ray along the axis
 */
export function castRay(ox: number, oy: number, dx: number, dy: number): number {
    const a = dx * dx + dy * dy;
    if (a === 0) {
        return Infinity;
    }
    const b = ox * dx + oy * dy;
    const c = ox * ox + oy * oy - 1;
    return (-b + Math.sqrt(b * b - a * c)) / a;
}

// shortest signed difference between two texture coordinates (the texture wraps)
export function wrapDelta(d: number): number {
    return d - TEX_SIZE * Math.round(d / TEX_SIZE);
}

/* seamless TEX_SIZE x TEX_SIZE texture from any image
 *
 * The image is reduced to a TILE x TILE tile (box filter), which is mirrored left/right and
 * top/bottom: the edges of the texture match, so wrapping around the tube shows no seam.
 */
export function seamlessTexture(image: Surface): Uint32Array {
    const sw = image.width;
    const sh = image.height;
    const src = image.data32;

    // box filter the image down to a tile
    const tile = new Uint32Array(TILE * TILE);
    for (let ty = 0; ty < TILE; ty++) {
        const y0 = Math.floor((ty * sh) / TILE);
        const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sh) / TILE));
        for (let tx = 0; tx < TILE; tx++) {
            const x0 = Math.floor((tx * sw) / TILE);
            const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sw) / TILE));
            let r = 0;
            let g = 0;
            let b = 0;
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const p = src[y * sw + x];
                    r += p & 0xff;
                    g += (p >>> 8) & 0xff;
                    b += (p >>> 16) & 0xff;
                }
            }
            const n = (y1 - y0) * (x1 - x0);
            tile[ty * TILE + tx] =
                (0xff000000 | (Math.round(b / n) << 16) | (Math.round(g / n) << 8) | Math.round(r / n)) >>> 0;
        }
    }

    // mirror the tile
    const tex = new Uint32Array(TEX_SIZE * TEX_SIZE);
    const mirror = (i: number) => (i < TILE ? i : TEX_MASK - i);
    for (let v = 0; v < TEX_SIZE; v++) {
        for (let u = 0; u < TEX_SIZE; u++) {
            tex[v * TEX_SIZE + u] = tile[mirror(v) * TILE + mirror(u)];
        }
    }

    return tex;
}

//----- class
export class Tunnel extends IAnimation {
    //----- members
    private image_: Surface; // source image
    private texture_: Uint32Array; // seamless texture (TEX_SIZE x TEX_SIZE)

    // values on the grid (gw x gh points)
    private gw_: number;
    private gh_: number;
    private gridU_: Float64Array; // angle around the tube (texels)
    private gridV_: Float64Array; // depth (texels)
    private gridS_: Float64Array; // wall light [0..255]
    private gridG_: Float64Array; // glow of the light at the end [0..255]

    //----- methods
    // constructor
    constructor(display: Display) {
        super("tunnel", display);

        // set the vars
        this.image_ = new Surface();
        this.texture_ = new Uint32Array(TEX_SIZE * TEX_SIZE);

        this.gw_ = Math.ceil(display.width / GRID) + 1;
        this.gh_ = Math.ceil(display.height / GRID) + 1;
        const n = this.gw_ * this.gh_;
        this.gridU_ = new Float64Array(n);
        this.gridV_ = new Float64Array(n);
        this.gridS_ = new Float64Array(n);
        this.gridG_ = new Float64Array(n);
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-tunnel.texture.jpg").then(() => {
            this.texture_ = seamlessTexture(this.image_);
        });
    }

    // cast the rays of the grid for the camera at a given time (s)
    private castGrid(time: number): void {
        const w = this.width_;
        const h = this.height_;
        const focal = FOCAL * w;

        // camera position across the tube (drifts off the axis)
        const ox = 0.45 * Math.sin(0.7 * time);
        const oy = 0.35 * Math.sin(0.9 * time + 1.0);

        // camera orientation: yaw (left / right), pitch (up / down), roll
        const yaw = 0.35 * Math.sin(0.5 * time + 0.5);
        const pitch = 0.25 * Math.sin(0.63 * time);
        const roll = 0.3 * Math.sin(0.31 * time);
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);

        // texture scroll: flight along the tube and twist around it
        const travel = (time * SPEED * V_UNIT) % TEX_SIZE;
        const twist = (time * TWIST) % TEX_SIZE;
        const uScale = U_AROUND / (2 * Math.PI);

        let k = 0;
        for (let j = 0; j < this.gh_; j++) {
            const py = (j * GRID - (h >> 1)) / focal;
            for (let i = 0; i < this.gw_; i++, k++) {
                const px = (i * GRID - (w >> 1)) / focal;

                // ray direction in the camera: roll, then pitch, then yaw
                const rx = px * cr - py * sr;
                const ry = px * sr + py * cr;
                const ty = ry * cp - sp;
                const tz = ry * sp + cp;
                const dx = rx * cy + tz * sy;
                const dz = tz * cy - rx * sy;

                // hit point on the wall
                let t = castRay(ox, oy, dx, ty);
                if (t * dz > Z_MAX || dz <= 0) {
                    t = dz > 0 ? Z_MAX / dz : Z_MAX;
                }
                const z = Math.max(0, t * dz);
                const angle = Math.atan2(oy + ty * t, ox + dx * t);

                // texture coordinates (wrapped in [0, TEX_SIZE[)
                let u = (angle * uScale + twist) % TEX_SIZE;
                let v = (z * V_UNIT + travel) % TEX_SIZE;
                if (u < 0) u += TEX_SIZE;
                if (v < 0) v += TEX_SIZE;

                // light: fog on the walls, faint glow at the end (s + g <= 255: no overflow)
                const e = 1 - Math.exp(-z / HAZE);
                const g = GLOW * e * e * e;
                const s = Math.min(255 * Math.exp(-z / FOG), 255 - g);

                this.gridU_[k] = u;
                this.gridV_[k] = v;
                this.gridS_[k] = s;
                this.gridG_[k] = g;
            }
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        this.castGrid(timestamp / 1000);

        const w = this.width_;
        const h = this.height_;
        const gw = this.gw_;
        const gu = this.gridU_;
        const gv = this.gridV_;
        const gs = this.gridS_;
        const gg = this.gridG_;
        const tex = this.texture_;
        const dst = this.display_.surface.data32;
        const inv = 1 / GRID;

        for (let by = 0; by < h; by += GRID) {
            const j = by / GRID;
            const rows = Math.min(GRID, h - by);

            for (let bx = 0; bx < w; bx += GRID) {
                const i = bx / GRID;
                const cols = Math.min(GRID, w - bx);

                // the 4 corners of the block; u and v made continuous across the wrap
                const k00 = j * gw + i;
                const k10 = k00 + 1;
                const k01 = k00 + gw;
                const k11 = k01 + 1;

                const u00 = gu[k00] + BIAS;
                const u10 = u00 + wrapDelta(gu[k10] - gu[k00]);
                const u01 = u00 + wrapDelta(gu[k01] - gu[k00]);
                const u11 = u00 + wrapDelta(gu[k11] - gu[k00]);
                const v00 = gv[k00] + BIAS;
                const v10 = v00 + wrapDelta(gv[k10] - gv[k00]);
                const v01 = v00 + wrapDelta(gv[k01] - gv[k00]);
                const v11 = v00 + wrapDelta(gv[k11] - gv[k00]);

                // left and right edges, stepped down the block
                let uL = u00;
                let vL = v00;
                let sL = gs[k00];
                let gL = gg[k00];
                let uR = u10;
                let vR = v10;
                let sR = gs[k10];
                let gR = gg[k10];
                const duL = (u01 - u00) * inv;
                const dvL = (v01 - v00) * inv;
                const dsL = (gs[k01] - gs[k00]) * inv;
                const dgL = (gg[k01] - gg[k00]) * inv;
                const duR = (u11 - u10) * inv;
                const dvR = (v11 - v10) * inv;
                const dsR = (gs[k11] - gs[k10]) * inv;
                const dgR = (gg[k11] - gg[k10]) * inv;

                let row = by * w + bx;
                for (let y = 0; y < rows; y++, row += w) {
                    // values along the scanline
                    let u = uL;
                    let v = vL;
                    let s = sL;
                    let g = gL;
                    const du = (uR - uL) * inv;
                    const dv = (vR - vL) * inv;
                    const ds = (sR - sL) * inv;
                    const dg = (gR - gL) * inv;

                    for (let x = 0; x < cols; x++) {
                        const c = tex[(((v | 0) & TEX_MASK) << 8) | ((u | 0) & TEX_MASK)];
                        const gi = g | 0;
                        const r = (((c & 0xff) * s) >> 8) + gi;
                        const gr = ((((c >>> 8) & 0xff) * s) >> 8) + gi;
                        const b = ((((c >>> 16) & 0xff) * s) >> 8) + gi;
                        dst[row + x] = 0xff000000 | (b << 16) | (gr << 8) | r;

                        u += du;
                        v += dv;
                        s += ds;
                        g += dg;
                    }

                    uL += duL;
                    vL += dvL;
                    sL += dsL;
                    gL += dgL;
                    uR += duR;
                    vR += dvR;
                    sR += dsR;
                    gR += dgR;
                }
            }
        }
    }
}
