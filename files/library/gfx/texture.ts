/*
 * @file    texture.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Perspective-correct textured convex polygon filler
 *
 *          1/z, u/z and v/z are linear in screen space: they are interpolated along the edges for
 *          each scanline, and along a span the exact u, v (u/z / 1/z) are computed every SUBDIV
 *          pixels and linearly interpolated in between (one division per SUBDIV pixels).
 *
 *          Fill rule (top-left): rows ceil(ymin) .. ceil(ymax) - 1, pixels ceil(xl) .. ceil(xr) - 1,
 *          so polygons sharing an edge never overlap nor leave holes.
 */

//----- imports
import { Surface } from "./surface";

//----- globals
export const TEXTURE_SIZE = 256; // textures are 256x256 (lookups (v << 8) | u)
export const SUBDIV = 16; // exact perspective every SUBDIV pixels

const TEXEL_MAX = TEXTURE_SIZE - 1e-6; // u, v are clamped to [0, TEXEL_MAX] before truncation

//----- interfaces
// a polygon vertex
export interface TexVertex {
    x: number; // screen position (float)
    y: number; // screen position (float)
    z: number; // camera depth (> 0)
    u: number; // texel coordinates in [0, 256]
    v: number;
}

//----- class
// an edge of a polygon chain, walked from top to bottom
class Edge {
    next: number = 0; // index of the bottom vertex of the edge
    yEnd: number = 0; // first row below the edge (ceil of the bottom vertex y)
    y0: number = 0; // top vertex y
    x0: number = 0; // values at the top vertex ...
    iz0: number = 0;
    uz0: number = 0;
    vz0: number = 0;
    dx: number = 0; // ... and their derivatives along y
    diz: number = 0;
    duz: number = 0;
    dvz: number = 0;

    // set the edge from vertex a to vertex b
    set(poly: TexVertex[], a: number, b: number): void {
        const pa = poly[a];
        const pb = poly[b];
        const iza = 1 / pa.z;
        const izb = 1 / pb.z;
        this.next = b;
        this.yEnd = Math.ceil(pb.y);
        this.y0 = pa.y;
        this.x0 = pa.x;
        this.iz0 = iza;
        this.uz0 = pa.u * iza;
        this.vz0 = pa.v * iza;

        const dy = pb.y - pa.y;
        if (dy > 0) {
            const idy = 1 / dy;
            this.dx = (pb.x - pa.x) * idy;
            this.diz = (izb - iza) * idy;
            this.duz = (pb.u * izb - this.uz0) * idy;
            this.dvz = (pb.v * izb - this.vz0) * idy;
        } else {
            // horizontal edge: never used for a row
            this.dx = this.diz = this.duz = this.dvz = 0;
        }
    }
}

// the two chains of the polygon (preallocated, reused for every polygon)
const chainA = new Edge();
const chainB = new Edge();

//----- functions

/* draw a perspective-correct textured convex polygon
 *
 * Args:
 *      dst    : destination pixels (ABGR), width x height
 *      width  : destination width
 *      height : destination height
 *      poly   : convex polygon (3+ vertices, any winding)
 *      texture: 256x256 texture pixels (ABGR)
 *      shade  : multiplies R, G, B, in [0, 1] (default 1); alpha is forced to 0xff
 */
export function drawTexturedPolygon(
    dst: Uint32Array,
    width: number,
    height: number,
    poly: TexVertex[],
    texture: Uint32Array,
    shade: number = 1,
): void {
    const n = poly.length;
    if (n < 3) return;

    // top and bottom vertices
    let top = 0;
    let bottom = 0;
    for (let i = 1; i < n; i++) {
        if (poly[i].y < poly[top].y) top = i;
        if (poly[i].y > poly[bottom].y) bottom = i;
    }

    // rows to draw, clipped to the buffer
    const yStart = Math.max(Math.ceil(poly[top].y), 0);
    const yEnd = Math.min(Math.ceil(poly[bottom].y), height);
    if (!(yStart < yEnd)) return;

    // shade in 8:8 fixed point
    const s = Math.round(Math.min(Math.max(shade, 0), 1) * 256);

    // the two chains from the top vertex: one walking the vertex list forward, the other backward
    chainA.set(poly, top, (top + 1) % n);
    chainB.set(poly, top, (top + n - 1) % n);

    for (let y = yStart; y < yEnd; y++) {
        // move to the edges covering this row
        while (chainA.yEnd <= y && chainA.next !== bottom) chainA.set(poly, chainA.next, (chainA.next + 1) % n);
        while (chainB.yEnd <= y && chainB.next !== bottom) chainB.set(poly, chainB.next, (chainB.next + n - 1) % n);

        // left / right edges
        let l = chainA;
        let r = chainB;
        let xl = l.x0 + (y - l.y0) * l.dx;
        let xr = r.x0 + (y - r.y0) * r.dx;
        if (xl > xr) {
            l = chainB;
            r = chainA;
            const t = xl;
            xl = xr;
            xr = t;
        }

        // pixels to draw, clipped to the buffer
        const xs = Math.max(Math.ceil(xl), 0);
        const xe = Math.min(Math.ceil(xr), width);
        if (!(xs < xe)) continue;

        // interpolants on both sides and their derivatives along x
        const tl = y - l.y0;
        const tr = y - r.y0;
        const izl = l.iz0 + tl * l.diz;
        const uzl = l.uz0 + tl * l.duz;
        const vzl = l.vz0 + tl * l.dvz;
        const idx = 1 / (xr - xl);
        const diz = (r.iz0 + tr * r.diz - izl) * idx;
        const duz = (r.uz0 + tr * r.duz - uzl) * idx;
        const dvz = (r.vz0 + tr * r.dvz - vzl) * idx;

        // exact u, v at the first pixel (every sample lies inside the span, so 1/z > 0)
        let t = xs - xl;
        let iz = izl + t * diz;
        let u0 = clamp((uzl + t * duz) / iz);
        let v0 = clamp((vzl + t * dvz) / iz);

        // walk the span by segments of SUBDIV pixels, the last one ending on the last pixel
        const last = xe - 1;
        let x = xs;
        let p = y * width + xs;
        for (;;) {
            const x1 = x + SUBDIV < last ? x + SUBDIV : last;
            const count = x1 - x;

            // exact u, v at the end of the segment
            t = x1 - xl;
            iz = izl + t * diz;
            const u1 = clamp((uzl + t * duz) / iz);
            const v1 = clamp((vzl + t * dvz) / iz);

            // affine in between (x .. x1 - 1)
            if (count > 0) {
                const du = (u1 - u0) / count;
                const dv = (v1 - v0) / count;
                let u = u0;
                let v = v0;
                if (s === 256) {
                    for (let k = 0; k < count; k++) {
                        dst[p++] = texture[((v | 0) << 8) | (u | 0)] | 0xff000000;
                        u += du;
                        v += dv;
                    }
                } else {
                    for (let k = 0; k < count; k++) {
                        dst[p++] = shadePixel(texture[((v | 0) << 8) | (u | 0)], s);
                        u += du;
                        v += dv;
                    }
                }
            }

            x = x1;
            u0 = u1;
            v0 = v1;
            if (x === last) break;
        }

        // last pixel of the span
        const c = texture[((v0 | 0) << 8) | (u0 | 0)];
        dst[p] = s === 256 ? c | 0xff000000 : shadePixel(c, s);
    }
}

// =true when the surface holds a TEXTURE_SIZE x TEXTURE_SIZE texture (false until it is loaded)
export function isTextureReady(surface: Surface): boolean {
    return surface.width === TEXTURE_SIZE && surface.height === TEXTURE_SIZE;
}

// load a texture image, which must be TEXTURE_SIZE x TEXTURE_SIZE (the promise is rejected otherwise)
export function loadTexture(surface: Surface, url: string): Promise<void> {
    return surface.loadImage(url).then(() => {
        if (!isTextureReady(surface)) {
            const { width, height } = surface;
            throw new Error(`Texture is ${width}x${height}, expected ${TEXTURE_SIZE}x${TEXTURE_SIZE}.`);
        }
    });
}

// clamp a texel coordinate so that its truncation lies in [0, 255]
function clamp(c: number): number {
    return c < 0 ? 0 : c > TEXEL_MAX ? TEXEL_MAX : c;
}

// multiply R, G, B by s / 256 (s in [0, 256]), force alpha to 0xff
function shadePixel(c: number, s: number): number {
    return (((((c & 0xff00ff) * s) >>> 8) & 0xff00ff) | ((((c & 0xff00) * s) >>> 8) & 0xff00) | 0xff000000) >>> 0;
}
