/*
 * @file    palette.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Color palette management
 */

//----- imports
import { Color } from "./color";
import { Components } from "./basecolor";

//----- class
export class Palette {
    //----- members
    private colors_: Color[];

    //----- methods
    constructor() {
        this.colors_ = [ ];
    }

    public dump(): void {
        for(var i = 0; i < this.colors_.length; i++) {
            console.log(`${i} : ` + this.colors_[i].color.css());
        }
    }

    public get count(): number {
        return this.colors_.length;
    }

    public set push(c: Color) {
        this.colors_.push(c);
    }

    public getColor(i: number): Color|undefined {
        if ( i > this.colors_.length ) {
            return undefined;
        }
        else {
            return this.colors_[i];
        }
    }

    public setColor(i: number, c: Color): void {
        this.colors_[i] = c;
    }

    public swap(i1: number, i2: number): void {

        // check indexes values are within the authorized range
        if ( (i1 < 0) || (i1 > this.colors_.length) ) {
            throw RangeError("swap(): Index #1 is out of range.");
        }

        if ( (i2 < 0) || (i2 > this.colors_.length) ) {
            throw RangeError("swap(): Index #2 is out of range.");
        }

        // nothing to be done if both indexes are equals
        if ( i1 == i2 ) {
            return;
        }

        [ this.colors_[i1], this.colors_[i2] ] = [ this.colors_[i2], this.colors_[i1] ];
    }

    public gradient(begin: Color, end: Color, steps: number): void {
        // ensure both color are in the same space
        if ( begin.color.model != end.color.model ) {
            throw Error("gradient(): Both colors need to be in the same space.");
        }

        let x: number, y: number, z: number, a: number;
        let dx: number, dy: number, dz: number, da: number;

        let v1: Components = begin.color.values;
        let v2: Components = end.color.values;

        // ensure both colors are from the same color space
        if ( v1.m != v2.m ) {
            throw Error("Both colors should be from the same color space.");
        }

        // initialize values
        [ x, y, z, a ] = [ v1.x, v1.y, v1.z, v1.a ];

        // (-1) so we are sure to go from c1 up to c2
        dx = (v2.x - x) / (steps - 1);
        dy = (v2.y - y) / (steps - 1);
        dz = (v2.z - z) / (steps - 1);
        da = (v2.a - a) / (steps - 1);

        // create colors
        for(var i = 0; i < steps; i++) {
            // add this new color
            this.colors_.push( new Color(v1.m, x, y, z, a) );

            // increment values
            x += dx;
            y += dy;
            z += dz;
            a += da;
        }
    }
}