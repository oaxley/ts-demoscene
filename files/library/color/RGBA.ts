/*
 * @file    RGBA.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   RGBA color class
 */

//----- imports
import { BaseColor, Components, COLOR_MODEL } from "./basecolor"


//---- class
export class RGBA extends BaseColor {

    //----- methods

    constructor(r: number = 0, g: number = 0, b: number = 0, alpha: number = 255) {
        super(COLOR_MODEL.RGBA, r, g, b, alpha);
    }

    public static from(color: BaseColor): RGBA {
        if ( color.model == COLOR_MODEL.RGBA ) {
            return this.fromRGBA(color.values);
        }
    }

    public dump(): void {
        console.log(`RGBA: R = ${this.x_}, G = ${this.y_}, B = ${this.z_}, A = ${this.a_}`);
    }

    public css(): string {
        return `rgba(${this.x_}, ${this.y_}, ${this.z_}, ${this.a_})`;
    }

    public hex(): string {
        function _hexConversion(value:number):string {
            let str = value.toString(16);
            str = (str.length < 2) ? '0' + str : str;
            return str;
        }

        let r = _hexConversion(this.x_);
        let g = _hexConversion(this.y_);
        let b = _hexConversion(this.z_);

        return `#${r}${g}${b}`;
    }

    private static fromRGBA(rgba: Components): RGBA {
        return new RGBA(rgba.x, rgba.y, rgba.z, rgba.a);
    }


}