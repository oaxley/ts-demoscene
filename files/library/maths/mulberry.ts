/*
 * @file    mulberry.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Small seeded pseudo random generator (mulberry32)
 *
 *          Much cheaper than the Mersenne Twister, enough for visual effects that must replay
 *          the same sequence from a seed.
 */

//----- imports
import { IPrng } from "./prng";

//----- class
export class Mulberry32 extends IPrng {
    //----- members
    private state_: number;

    //----- methods
    constructor(seed: number) {
        super();

        // set the vars
        this.state_ = 0;
        this.initialize(seed);
    }

    // return a new value from the generator (unsigned 32-bit)
    protected value(): number {
        this.state_ = (this.state_ + 0x6d2b79f5) >>> 0;
        let t = this.state_;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    }

    // initialize the random generator
    public initialize(seed: number): void {
        this.state_ = seed >>> 0;
    }

    // next value, in [0, 1) (value / 2^32, unlike rand() which divides by 2^32 - 1)
    public next(): number {
        return this.value() / 4294967296;
    }
}
