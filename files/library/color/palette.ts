/*
 * @file    palette.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Color palette management
 */

//----- imports
import { Color } from "./color";

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

}