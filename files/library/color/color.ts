/*
 * @file    color.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Aggregated class for Color management
 */

//----- imports
import { COLOR_MODEL, BaseColor, Components } from "./basecolor";
import { RGBA } from "./RGBA";
import { HSLA } from "./HSLA";
import { HSVA } from "./HSVA";


//----- globals
const NOT_IN_USED = -1.0;

//----- class
export class Color {
    //----- members
    private color_: BaseColor;

    //----- methods
    constructor(model: COLOR_MODEL, x: number, y: number, z: number, a: number = NOT_IN_USED) {
        // alpha value is [0..1] for HSLA/HSVA and [0..255] for RGBA
        if ( a === NOT_IN_USED ) {
            a = 1.0;
        }

        switch(model) {
            case COLOR_MODEL.HSLA:
                a = ( a > 1.0 ) ? a / 255.0 : a;
                this.color_ = new HSLA(x, y, z, a);
                break;

            case COLOR_MODEL.HSVA:
                a = ( a > 1.0 ) ? a / 255.0 : a;
                this.color_ = new HSVA(x, y, z, a);
                break;

            case COLOR_MODEL.RGBA:
                a = ( a <= 1.0 ) ? a*255 : a;
                this.color_ = new RGBA(Math.round(x), Math.round(y), Math.round(z), Math.round(a));
                break;

            default:
                throw Error("Unknown color model.");
        }
    }

    public get color() {
        return this.color_;
    }

    public static from(c: RGBA|HSLA|HSVA): Color {
        let values: Components = c.values;
        return new Color(values.m, values.x, values.y, values.z, values.a);
    }
}