/*
 * @file    fixed.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   16:16 Fixed maths class
 */

//----- globals
const SHIFT = 16;

//----- class
export class Fixed {

    //----- members
    private value_: number;

    //----- methods
    constructor(value: number) {
        if (Number.isInteger(value))
            this.value_ = value << SHIFT;
        else
            this.value_ = this.floatToFixed(value);
    }

    // convert a float to the fixed format
    private floatToFixed(value: number): number {
        return Math.floor(value * (1 << SHIFT));
    }

    // convert a fixed format to float
    public float(): number {
        return this.value_ / (1 << SHIFT);
    }

    // convert a fixed format to int
    public int(): number {
        return this.value_ >> SHIFT
    }

}