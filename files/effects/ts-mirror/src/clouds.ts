/*
 * @file    clouds.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Cloud texture (ts-mirror)
 *
 *          A 256x256 map of cloud density in [0, 1], made once from a seed:
 *            - fractal value noise: a few octaves of a smooth random grid, each one twice as fine
 *              and half as strong as the previous one. Every grid period divides 256, so the
 *              texture tiles without a seam while it scrolls;
 *            - shaped into puffs: below a threshold the sky is clear, above it the density rises
 *              smoothly to thick white cloud.
 *
 *          Far away a pixel covers many texels: the texture is kept at every size (each level
 *          is the 2x2 average of the previous one) and the level is picked from the footprint, so
 *          far clouds blend into an even veil instead of flickering.
 */

//----- imports
import { Mulberry32 } from "library/maths/mulberry";
import { smoothstep } from "library/maths/utils";

//----- globals
export const CLOUD_SIZE = 256; // texture size (texels)
const SIZE_SHIFT = 8;
const OCTAVES = 5; // noise layers
const BASE_CELLS = 4; // grid cells across the texture for the first octave
const COVER_LOW = 0.42; // density below this noise value: clear sky
const COVER_HIGH = 0.66; // above this: thick cloud

//----- interfaces
export interface CloudTexture {
    levels: Float32Array[]; // level k: (256 >> k)² densities, index (y << (8 - k)) | x
}

//----- functions

// one octave: smooth random grid of n x n cells, periodic over the texture, added into out
function addOctave(out: Float32Array, n: number, amplitude: number, rng: Mulberry32): void {
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) {
        grid[i] = rng.rand();
    }
    const cell = CLOUD_SIZE / n;
    for (let y = 0; y < CLOUD_SIZE; y++) {
        const gy = y / cell;
        const y0 = Math.floor(gy);
        const ty = smoothstep(gy - y0);
        const r0 = (y0 % n) * n;
        const r1 = ((y0 + 1) % n) * n;
        for (let x = 0; x < CLOUD_SIZE; x++) {
            const gx = x / cell;
            const x0 = Math.floor(gx);
            const tx = smoothstep(gx - x0);
            const c0 = x0 % n;
            const c1 = (x0 + 1) % n;
            const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * tx;
            const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * tx;
            out[(y << SIZE_SHIFT) | x] += (a + (b - a) * ty) * amplitude;
        }
    }
}

/* build the cloud texture
 *
 * Args:
 *      seed : random seed (same seed, same clouds)
 */
export function cloudTexture(seed: number): CloudTexture {
    const rng = new Mulberry32(seed);
    const base = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);

    // fractal noise, normalised to [0, 1]
    let amplitude = 1;
    let total = 0;
    for (let o = 0, n = BASE_CELLS; o < OCTAVES; o++, n *= 2, amplitude /= 2) {
        addOctave(base, n, amplitude, rng);
        total += amplitude;
    }

    // puffs
    for (let i = 0; i < base.length; i++) {
        const t = (base[i] / total - COVER_LOW) / (COVER_HIGH - COVER_LOW);
        base[i] = t <= 0 ? 0 : t >= 1 ? 1 : smoothstep(t);
    }

    // averaged levels down to 1x1
    const levels = [base];
    for (let size = CLOUD_SIZE >> 1; size >= 1; size >>= 1) {
        const prev = levels[levels.length - 1];
        const next = new Float32Array(size * size);
        const ps = size * 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const i = 2 * y * ps + 2 * x;
                next[y * size + x] = (prev[i] + prev[i + 1] + prev[i + ps] + prev[i + ps + 1]) / 4;
            }
        }
        levels.push(next);
    }
    return { levels };
}

/* cloud density at a texture point, filtered over a footprint
 *
 * Args:
 *      x, y      : point (texels, any value: the texture repeats)
 *      footprint : size covered by the pixel (texels, 0: sharp)
 */
export function sampleCloud(tex: CloudTexture, x: number, y: number, footprint: number): number {
    const last = tex.levels.length - 1;
    let k = footprint > 1 ? Math.log2(footprint) : 0;
    if (k >= last) {
        return tex.levels[last][0];
    }

    // blend the two levels around the footprint (smooth when the depth changes)
    const k0 = Math.floor(k);
    k -= k0;
    const a = bilinear(tex.levels[k0], SIZE_SHIFT - k0, x / (1 << k0), y / (1 << k0));
    if (k < 1e-6) {
        return a;
    }
    const k1 = k0 + 1;
    const b =
        k1 === last ? tex.levels[last][0] : bilinear(tex.levels[k1], SIZE_SHIFT - k1, x / (1 << k1), y / (1 << k1));
    return a + (b - a) * k;
}

// bilinear sample of a level of size 1 << shift (texel k at coordinate k, repeating)
function bilinear(level: Float32Array, shift: number, x: number, y: number): number {
    const mask = (1 << shift) - 1;
    const xf = Math.floor(x);
    const yf = Math.floor(y);
    const tx = x - xf;
    const ty = y - yf;
    const x0 = xf & mask;
    const x1 = (xf + 1) & mask;
    const r0 = (yf & mask) << shift;
    const r1 = ((yf + 1) & mask) << shift;
    const a = level[r0 | x0] + (level[r0 | x1] - level[r0 | x0]) * tx;
    const b = level[r1 | x0] + (level[r1 | x1] - level[r1 | x0]) * tx;
    return a + (b - a) * ty;
}
