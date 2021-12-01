/*
 * @file    mersenne.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Mersenne Twister random number generator
 */

//----- imports
import { IPrng } from "./prng";

//----- globals
const MT_0 = 0x6C078965;
const MT_W = 32;
const MT_N = 624;
const MT_M = 397;
const MT_R = 31;
const MT_A = 0x9908B0DF;
const MT_U = 11;
const MT_S = 7;
const MT_B = 0x9D2C5680;
const MT_T = 15;
const MT_C = 0xEFC60000;
const MT_I = 18;

const MT_MASK_1 = 0xffffffff
const MT_MASK_2 = 0x7fffffff


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
        this.states_= new Uint32Array(new Array(MT_N));
    }

    // generate a new set of values
    private generate(): void {
        for (let i = 0; i < MT_N; i++) {
            let y = (this.states_[i] + (this.states_[(i + 1) % MT_N] & MT_MASK_2)) & MT_MASK_1;
            this.states_[i] = this.states_[(i + MT_M) % MT_N] ^ (y >> 1);
            if ((y % 2) != 0) {
                this.states_[i] = this.states_[i] ^ MT_A;
            }
        }
    }

    // return a new value from the generator
    protected value(): number {
        if (this.index_ == 0) {
            this.generate();
        }

        let value: number = this.states_[this.index_];
        value = value ^ (value >> MT_U);
        value = value ^ ((value << MT_S) & MT_B);
        value = value ^ ((value << MT_T) & MT_C);
        value = value ^ (value >> MT_I);

        this.index_ = (this.index_ + 1) & MT_N;

        return value;
    }

    // initialize the random generator
    public initialize(seed: number): void {
        // seed should be 32-bit number
        this.states_[0] = seed >>> 0;
        for (let i = 1; i < MT_N; i++) {
            this.states_[i] = ((MT_0 * (this.states_[i - 1] ^ (this.states_[i - 1] >> 30))) + i) & MT_MASK_1;
        }
    }
}