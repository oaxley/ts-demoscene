/*
 * @file    prng.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Abstrat class for random generators
 */

//----- globals
const RAND_MAX_VALUE: number = (~0) >>> 0;

//----- class
export abstract class IPrng {

    //----- members

    //----- methods
    constructor() { }

    // return a new value from the generator
    protected abstract value(): number;

    // initialize the random generator
    public abstract initialize(seed:number): void;

    // return a random number between [0.0, 1.0[
    public rand(): number {
        return this.value() / RAND_MAX_VALUE;
    };

    // return an integer between [min, max[
    public randInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(min + this.rand() * (max - min));
    }

    // return a value following a normal gaussian law
    public randGaus(mean: number, stdev: number): number {
        let x: number = 0.0
        let y: number = 0.0;
        let r: number = 0.0;

        // find a point inside the circle of radius 1.0 and centered around (0,0)
        while ((r >= 1.0) || (r == 0)) {
            x = 2.0 * this.rand() - 1.0;
            y = 2.0 * this.rand() - 1.0;
            r = x * x + y * y;
        }

        let s = Math.sqrt(-2.0 * Math.log(r) / r);
        return mean + x * s * stdev;
    }
}