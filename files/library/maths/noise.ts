/*
 * @file    noise.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Random noise generator
 */

//----- imports
import { lerp } from "./utils";
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
            seed = (seed === undefined) ? performance.now() : seed;
            let mt = new Mersenne();
            mt.initialize(seed);

            // fill the grid
            for (let i = 0; i < MAX_VERTICES; i++) {
                this.vertices_[i] = mt.rand();
            }
        }

        // smoothstep function
        private smoothStep(a: number, b: number, t: number): number {
            t = t * t * (3 - 2 * t);
            return lerp(a, b, t);
        }

        // evaluate the noise at position x
        public eval(x: number): number {
            let xi = Math.floor(x);
            let xmin = xi & MAX_VERTICES_MASK;
            let xmax = (xmin + 1) & MAX_VERTICES_MASK;
            let t = x - xi;

            return this.smoothStep(this.vertices_[xmin], this.vertices_[xmax], t);
        }
    }
}
