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


}