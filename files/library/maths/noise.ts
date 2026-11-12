/*
 * @file    noise.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Random noise generator
 */

//----- imports
import { lerp, smoothstep } from "./utils";
import { Mersenne } from "./mersenne";

//----- globals
const MAX_VERTICES = 256;
const MAX_VERTICES_MASK = MAX_VERTICES - 1;

//----- class
export namespace Noise {
    export class Noise1D {
        //----- members
        private vertices_: Array<number>;

        //----- methods
        constructor(seed?: number) {
            // create a 1D array of 512 elements
            this.vertices_ = new Array(MAX_VERTICES);

            // setup the Mersenne Twister random generator
            seed = seed === undefined ? performance.now() : seed;
            const mt = new Mersenne();
            mt.initialize(seed);

            // fill the grid
            for (let i = 0; i < MAX_VERTICES; i++) {
                this.vertices_[i] = mt.rand();
            }
        }

        // evaluate the noise at position x
        public eval(x: number): number {
            const xi = Math.floor(x);
            const xmin = xi & MAX_VERTICES_MASK;
            const xmax = (xmin + 1) & MAX_VERTICES_MASK;
            return lerp(this.vertices_[xmin], this.vertices_[xmax], smoothstep(x - xi));
        }
    }

    export class Noise2D {
        //----- members
        private vertices_: Array<number>; // the random values on the grid
        private permutation_: Uint16Array; // the permutation table

        //----- methods
        constructor(seed?: number) {
            // values and permutation table
            this.vertices_ = new Array(MAX_VERTICES);
            this.permutation_ = new Uint16Array(MAX_VERTICES << 1);

            // setup the Mersenne Twister random generator
            seed = seed === undefined ? performance.now() : seed;
            const mt = new Mersenne();
            mt.initialize(seed);

            // fill the grid & the permutation table
            for (let i = 0; i < MAX_VERTICES; i++) {
                this.vertices_[i] = mt.rand();
                this.permutation_[i] = i;
            }

            // shuffle the values in the permutation table
            for (let i = 0; i < MAX_VERTICES; i++) {
                const k = mt.randInt(0, MAX_VERTICES);
                [this.permutation_[i], this.permutation_[k]] = [this.permutation_[k], this.permutation_[i]];
                this.permutation_[i + MAX_VERTICES] = this.permutation_[i];
            }
        }

        // evaluate the 2D noise at position (x, y)
        public eval(x: number, y: number): number {
            const xi = Math.floor(x);
            const yi = Math.floor(y);

            // found the 4 corner of the cell
            const rx0 = xi & MAX_VERTICES_MASK;
            const rx1 = (rx0 + 1) & MAX_VERTICES_MASK;
            const ry0 = yi & MAX_VERTICES_MASK;
            const ry1 = (ry0 + 1) & MAX_VERTICES_MASK;

            // retrieve the random value at each of the corners
            const c00 = this.vertices_[this.permutation_[this.permutation_[rx0] + ry0]];
            const c10 = this.vertices_[this.permutation_[this.permutation_[rx1] + ry0]];
            const c01 = this.vertices_[this.permutation_[this.permutation_[rx0] + ry1]];
            const c11 = this.vertices_[this.permutation_[this.permutation_[rx1] + ry1]];

            // smoothing of tx & ty
            const sx = smoothstep(x - xi);
            const sy = smoothstep(y - yi);

            // 1st linear interpolation
            const nx0 = lerp(c00, c10, sx);
            const nx1 = lerp(c01, c11, sx);

            // 2nd linear interpolation
            return lerp(nx0, nx1, sy);
        }

        // create a fractal noise map
        public fractal(
            xmax: number,
            ymax: number,
            frequency?: number,
            amplitude?: number,
            layers?: number,
        ): Array<number> {
            // set the default values
            frequency = frequency === undefined ? 0.01 : frequency;
            amplitude = amplitude === undefined ? 1 : amplitude;
            layers = layers === undefined ? 5 : layers;

            const noise_map = new Array(xmax * ymax);
            let max_value = 0;

            // create the noise map
            for (let y = 0; y < ymax; y++) {
                const offset = y * xmax;
                for (let x = 0; x < xmax; x++) {
                    let f = frequency;
                    let a = amplitude;

                    noise_map[offset + x] = 0;
                    for (let l = 0; l < layers; l++) {
                        noise_map[offset + x] += this.eval(x * f, y * f) * a;
                        f *= 2;
                        a *= 0.5;
                    }

                    if (noise_map[offset + x] > max_value) {
                        max_value = noise_map[offset + x];
                    }
                }
            }

            // normalize all the values
            for (let y = 0; y < ymax; y++) {
                const offset = y * xmax;
                for (let x = 0; x < xmax; x++) {
                    noise_map[offset + x] /= max_value;
                }
            }

            return noise_map;
        }
    }
}
