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
const MAX_VERTICES = 512;
const MAX_VERTICES_MASK = MAX_VERTICES - 1;


//----- class
export namespace Noise {

    export class Noise1D {
        //----- members
        private vertices_: Array<number>;


        //----- methods
        constructor(seed?: number) {

            let mt = new Mersenne();
            this.vertices_ = new Array(MAX_VERTICES + 1);

            // generate the values
            if (seed === undefined) {
                seed = performance.now();
            }

            mt.initialize(seed);

            for (let i = 0; i <= MAX_VERTICES; i++) {
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
