/*
 * @file    palette.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Color palette management
 */

//----- imports
import { Color } from "./color";
import { Components, COLOR_MODEL } from "./basecolor";
import { RGBA } from "./RGBA";

//----- class
export class Palette {
    //----- members
    private colors_: Color[];
    private lut_: Uint32Array | undefined; // cached 32-bit values

    //----- methods
    constructor() {
        this.colors_ = [];
    }

    public dump(): void {
        for (var i = 0; i < this.colors_.length; i++) {
            console.log(`${i} : ` + this.colors_[i].color.css());
        }
    }

    public get count(): number {
        return this.colors_.length;
    }

    public set push(c: Color) {
        this.colors_.push(c);
        this.lut_ = undefined;
    }

    public getColor(i: number): Color | undefined {
        if (i < 0 || i >= this.colors_.length) {
            return undefined;
        } else {
            return this.colors_[i];
        }
    }

    public setColor(i: number, c: Color): void {
        this.colors_[i] = c;
        this.lut_ = undefined;
    }

    /* palette as packed 32-bit RGBA values (same layout as Surface.data32)
     *
     * The array is cached and rebuilt only when the palette changes. Missing
     * entries are set to 0.
     */
    public toUint32Array(): Uint32Array {
        if (this.lut_ === undefined || this.lut_.length != this.colors_.length) {
            let lut = new Uint32Array(this.colors_.length);
            for (let i = 0; i < this.colors_.length; i++) {
                let c = this.colors_[i];
                if (c === undefined) {
                    continue;
                }
                let rgba = c.color.model == COLOR_MODEL.RGBA ? <RGBA>c.color : RGBA.from(c.color);
                lut[i] = rgba ? rgba.uint32 : 0;
            }
            this.lut_ = lut;
        }
        return this.lut_;
    }

    public swap(i1: number, i2: number): void {
        // check indexes values are within the authorized range
        if (i1 < 0 || i1 >= this.colors_.length) {
            throw RangeError("swap(): Index #1 is out of range.");
        }

        if (i2 < 0 || i2 >= this.colors_.length) {
            throw RangeError("swap(): Index #2 is out of range.");
        }

        // nothing to be done if both indexes are equals
        if (i1 == i2) {
            return;
        }

        [this.colors_[i1], this.colors_[i2]] = [this.colors_[i2], this.colors_[i1]];
        this.lut_ = undefined;
    }

    public gradient(begin: Color, end: Color, steps: number): void {
        // ensure both color are in the same space
        if (begin.color.model != end.color.model) {
            throw Error("gradient(): Both colors need to be in the same space.");
        }

        let x: number, y: number, z: number, a: number;
        let dx: number, dy: number, dz: number, da: number;

        let v1: Components = begin.color.values;
        let v2: Components = end.color.values;

        // ensure both colors are from the same color space
        if (v1.m != v2.m) {
            throw Error("Both colors should be from the same color space.");
        }

        // initialize values
        [x, y, z, a] = [v1.x, v1.y, v1.z, v1.a];

        // (-1) so we are sure to go from c1 up to c2
        dx = (v2.x - x) / (steps - 1);
        dy = (v2.y - y) / (steps - 1);
        dz = (v2.z - z) / (steps - 1);
        da = (v2.a - a) / (steps - 1);

        // create colors
        for (var i = 0; i < steps; i++) {
            // add this new color
            this.colors_.push(new Color(v1.m, x, y, z, a));
            this.lut_ = undefined;

            // increment values
            x += dx;
            y += dy;
            z += dz;
            a += da;
        }
    }
}
