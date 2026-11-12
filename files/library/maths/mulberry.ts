/*
 * @file    mulberry.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Small seeded pseudo random generator (mulberry32)
 *
 *          Much cheaper than the Mersenne Twister, enough for visual effects that must replay
 *          the same sequence from a seed.
 */

//----- class
export class Mulberry32 {
    //----- members
    private state_: number;

    //----- methods
    constructor(seed: number) {
        this.state_ = seed >>> 0;
    }

    // next value, in [0, 1)
    public next(): number {
        this.state_ = (this.state_ + 0x6d2b79f5) >>> 0;
        let t = this.state_;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
