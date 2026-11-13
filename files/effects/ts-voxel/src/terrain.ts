/*
 * @file    terrain.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Voxel terrain: wrapped height & colour maps, text strip painting
 */

//----- imports
import { Mersenne } from "library/maths/mersenne";
import { lerp, smoothstep } from "library/maths/utils";
import { RGBA } from "library/color/RGBA";

//----- globals
export const MAP_SIZE = 512;
export const MAP_MASK = MAP_SIZE - 1;

// number of lattice cells over the map for each octave (all divide MAP_SIZE)
const OCTAVES = [4, 8, 16, 32, 64];

// colour bands by height: [max height, r, g, b]
const PALETTE: number[][] = [
    [40, 24, 52, 58], // deep, dark valley
    [80, 34, 82, 40], // dark green
    [130, 70, 120, 48], // green
    [175, 118, 100, 60], // brown
    [215, 128, 124, 118], // rock
    [256, 226, 230, 236], // snow
];

//----- functions
// value noise on a p x p lattice that wraps every MAP_SIZE texels
function periodicNoise(grid: Float32Array, p: number, x: number, y: number): number {
    const fx = (x * p) / MAP_SIZE;
    const fy = (y * p) / MAP_SIZE;
    const xi = Math.floor(fx);
    const yi = Math.floor(fy);
    const x0 = ((xi % p) + p) % p;
    const y0 = ((yi % p) + p) % p;
    const x1 = (x0 + 1) % p;
    const y1 = (y0 + 1) % p;

    const sx = smoothstep(fx - xi);
    const sy = smoothstep(fy - yi);
    const top = lerp(grid[y0 * p + x0], grid[y0 * p + x1], sx);
    const bottom = lerp(grid[y1 * p + x0], grid[y1 * p + x1], sx);
    return lerp(top, bottom, sy);
}

//----- class
export class Terrain {
    //----- members
    public readonly height: Uint8Array; // 0..255, MAP_SIZE x MAP_SIZE
    public readonly color: Uint32Array; // current colour map (with the text)

    private base_: Uint32Array; // colour map without the text
    private strip_: { y: number; h: number } | undefined; // last painted band

    //----- methods
    constructor(seed: number) {
        this.height = new Uint8Array(MAP_SIZE * MAP_SIZE);
        this.color = new Uint32Array(MAP_SIZE * MAP_SIZE);
        this.base_ = new Uint32Array(MAP_SIZE * MAP_SIZE);
        this.strip_ = undefined;

        this.buildHeight(seed);
        this.buildColor();
    }

    // fractal, tileable height map
    private buildHeight(seed: number): void {
        const grids = OCTAVES.map((p) => {
            const mt = new Mersenne();
            mt.initialize(seed + p);
            const grid = new Float32Array(p * p);
            for (let i = 0; i < grid.length; i++) grid[i] = mt.rand();
            return grid;
        });

        const raw = new Float32Array(MAP_SIZE * MAP_SIZE);
        let min = Infinity;
        let max = -Infinity;
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                let v = 0;
                let a = 1;
                for (let o = 0; o < OCTAVES.length; o++) {
                    v += periodicNoise(grids[o], OCTAVES[o], x, y) * a;
                    a *= 0.5;
                }
                raw[y * MAP_SIZE + x] = v;
                if (v < min) min = v;
                if (v > max) max = v;
            }
        }

        // normalise, then flatten the valleys
        for (let i = 0; i < raw.length; i++) {
            const n = (raw[i] - min) / (max - min);
            this.height[i] = Math.round(255 * Math.pow(n, 1.6));
        }
    }

    // colour by height band, lit by the slope
    private buildColor(): void {
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                const i = y * MAP_SIZE + x;
                const h = this.height[i];
                const band = PALETTE.find((b) => h < b[0]) || PALETTE[PALETTE.length - 1];

                const slope = h - this.height[this.index(x + 1, y + 1)];
                const light = Math.min(1.3, Math.max(0.5, 1 + slope * 0.03));

                const c = RGBA.toUInt32(
                    Math.min(255, band[1] * light),
                    Math.min(255, band[2] * light),
                    Math.min(255, band[3] * light),
                );
                this.base_[i] = c;
                this.color[i] = c;
            }
        }
    }

    // wrapped integer index in the maps
    public index(x: number, y: number): number {
        return (Math.floor(y) & MAP_MASK) * MAP_SIZE + (Math.floor(x) & MAP_MASK);
    }

    // wrapped, bilinear height
    public heightAt(x: number, y: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const tx = x - xi;
        const ty = y - yi;
        const h = this.height;
        const top = lerp(h[this.index(xi, yi)], h[this.index(xi + 1, yi)], tx);
        const bottom = lerp(h[this.index(xi, yi + 1)], h[this.index(xi + 1, yi + 1)], tx);
        return lerp(top, bottom, ty);
    }

    /* paint a line of glyphs in the colour map
     *
     * The band covers the map rows [cy, cy + glyphSize * scale[. The top of the
     * glyphs is on the far side (larger y), so the text reads upright from a
     * camera looking toward +y.
     *
     * Args:
     *      glyphs   : the glyph pixels (glyphSize x glyphSize, white on black)
     *      glyphSize: width/height of a glyph in pixels
     *      scale    : size of a glyph pixel in map texels
     *      cx, cy   : left / near corner of the band in the map
     *      offset   : horizontal scroll offset in texels
     *      tint     : text colour (uint32, as in the maps)
     *      depth    : size of a glyph pixel along the map y axis (default: scale);
     *                 stretching the glyphs in depth compensates the perspective
     */
    public paintStrip(
        glyphs: Uint32Array[],
        glyphSize: number,
        scale: number,
        cx: number,
        cy: number,
        offset: number,
        tint: number,
        depth: number = scale,
    ): void {
        const size = glyphSize * scale;
        this.strip_ = { y: cy, h: glyphSize * depth };

        const tr = tint & 0xff;
        const tg = (tint >>> 8) & 0xff;
        const tb = (tint >>> 16) & 0xff;

        for (let g = 0; g < glyphs.length; g++) {
            const pixels = glyphs[g];
            const left = cx - offset + g * size;

            for (let gy = 0; gy < glyphSize; gy++) {
                const my = cy + (glyphSize - 1 - gy) * depth;
                for (let gx = 0; gx < glyphSize; gx++) {
                    const k = pixels[gy * glyphSize + gx] & 0xff;
                    if (k === 0) continue;

                    const mx = left + gx * scale;
                    for (let sy = 0; sy < depth; sy++) {
                        for (let sx = 0; sx < scale; sx++) {
                            const i = this.index(mx + sx, my + sy);
                            const b = this.base_[i];
                            const r = ((b & 0xff) * (255 - k) + tr * k) / 255;
                            const gg = (((b >>> 8) & 0xff) * (255 - k) + tg * k) / 255;
                            const bb = (((b >>> 16) & 0xff) * (255 - k) + tb * k) / 255;
                            this.color[i] = RGBA.toUInt32(r, gg, bb);
                        }
                    }
                }
            }
        }
    }

    // remove the last painted strip (restore its rows from the base map)
    public restoreStrip(): void {
        if (this.strip_ === undefined) return;
        for (let r = 0; r < this.strip_.h; r++) {
            const row = ((this.strip_.y + r) & MAP_MASK) * MAP_SIZE;
            this.color.set(this.base_.subarray(row, row + MAP_SIZE), row);
        }
        this.strip_ = undefined;
    }
}
