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
        if (Number.isInteger(value)) this.value_ = value << SHIFT;
        else this.value_ = this.floatToFixed(value);
    }

    // create a fixed directly from its raw 16:16 value
    public static fromRaw(raw: number): Fixed {
        const f = new Fixed(0);
        f.value_ = raw | 0;
        return f;
    }

    // raw 16:16 value
    public get raw(): number {
        return this.value_;
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
        return this.value_ >> SHIFT;
    }

    // addition between two fixed
    public add(other: Fixed): Fixed {
        return Fixed.fromRaw(this.value_ + other.value_);
    }

    // substraction between two fixed
    public sub(other: Fixed): Fixed {
        return Fixed.fromRaw(this.value_ - other.value_);
    }

    // multiply two fixed
    public mul(other: Fixed): Fixed {
        return Fixed.fromRaw(Math.floor((this.value_ * other.value_) / (1 << SHIFT)));
    }

    // divide two fixed
    public div(other: Fixed): Fixed {
        return Fixed.fromRaw(Math.floor((this.value_ * (1 << SHIFT)) / other.value_));
    }
}
