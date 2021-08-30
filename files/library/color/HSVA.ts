/*
 * @file    HSVA.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   HSVA color class
 */

//----- imports
import { BaseColor, Components, COLOR_MODEL } from "./basecolor";


//----- class
export class HSVA extends BaseColor {

    //----- methods

    constructor(h: number = 0, s: number = 0, l: number = 0, alpha: number = 1.0) {
        super(COLOR_MODEL.HSVA, h, s, l, alpha);
    }

    public static from(color: BaseColor): HSVA {
        if ( color.model == COLOR_MODEL.HSVA ) {
            return this.fromHSVA(color.values);
        }
    }

    public dump(): void {
        console.log(`HSVA: H = ${this.x_}, S = ${this.y_}, V = ${this.z_}, A = ${this.a_}`);
    }

    public css(): string {
        throw Error("Method not implemented for HSVA color.");
    }

    public hex(): string {
        throw Error("Method not implemented for HSVA color.");
    }

    private static fromHSVA(hsva: Components): HSVA {
        return new HSVA(hsva.x, hsva.y, hsva.z, hsva.a);
    }

    private static fromHSLA(hsla: Components): HSVA {
        let h:number, s:number, l:number
        let v:number, x:number

        [ h, s, l ] = [ hsla.x, hsla.y, hsla.z ];

        if( l < 0.5 ) {
            x = s * l;
        } else {
            x = s * (1 - l);
        }

        v = l + x;
        s = (2 * x) / v;

        // encode the object - keep 3 decimals for precision
        return new HSVA(Math.round(h), this.clamp(s), this.clamp(v), hsla.a);
    }

}