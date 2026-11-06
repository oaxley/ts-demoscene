/*
 * @file    mersenne.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Mersenne Twister random number generator
 */

//----- imports
import { IPrng } from "./prng";

//----- globals
// MT19937 parameters
const MT_0 = 0x6C078965;            // initialization multiplier (1812433253)
const MT_N = 624;                   // degree of recurrence
const MT_M = 397;                   // middle word offset
const MT_A = 0x9908B0DF;            // twist matrix coefficients
const MT_U = 11;                    // tempering shifts / masks
const MT_S = 7;
const MT_B = 0x9D2C5680;
const MT_T = 15;
const MT_C = 0xEFC60000;
const MT_I = 18;

const MT_UPPER_MASK = 0x80000000;   // most significant bit
const MT_LOWER_MASK = 0x7fffffff;   // least significant 31 bits


//----- class
export class Mersenne extends IPrng {

    //----- members
    private states_: Uint32Array;
    private index_: number;

    //----- methods
    constructor() {
        super();

        // set the vars
        this.index_ = 0;
        this.states_= new Uint32Array(MT_N);
    }

    // generate a new set of values (twist)
    private generate(): void {
        const mt = this.states_;
        for (let i = 0; i < MT_N; i++) {
            let y = (mt[i] & MT_UPPER_MASK) | (mt[(i + 1) % MT_N] & MT_LOWER_MASK);
            let v = mt[(i + MT_M) % MT_N] ^ (y >>> 1);
            if ((y & 1) != 0) {
                v = v ^ MT_A;
            }
            mt[i] = v;
        }
    }

    // return a new value from the generator (unsigned 32-bit)
    protected value(): number {
        if (this.index_ == 0) {
            this.generate();
        }

        let value: number = this.states_[this.index_];
        value = value ^ (value >>> MT_U);
        value = value ^ ((value << MT_S) & MT_B);
        value = value ^ ((value << MT_T) & MT_C);
        value = value ^ (value >>> MT_I);

        this.index_ = (this.index_ + 1) % MT_N;

        return value >>> 0;
    }

    // initialize the random generator
    public initialize(seed: number): void {
        const mt = this.states_;

        // seed should be 32-bit number
        mt[0] = seed >>> 0;
        for (let i = 1; i < MT_N; i++) {
            let prev = mt[i - 1];
            mt[i] = (Math.imul(MT_0, prev ^ (prev >>> 30)) + i) >>> 0;
        }
        this.index_ = 0;
    }
}
