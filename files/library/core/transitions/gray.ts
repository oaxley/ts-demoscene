/*
 * @file    gray.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade to Gray transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "../surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export class FadeGray extends ITransition {

    //----- methods
    constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
        super('fade-gray', display, refimage, delay, viewport);
    }

    // compute the new values for RGBA
    protected compute(values: number[]): number[] {
        let [ r, g, b, a, t ] = values;
        let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
        return [ lerp(r, lum, t), lerp(g, lum, t), lerp(b, lum, t), a ];
    }
}
