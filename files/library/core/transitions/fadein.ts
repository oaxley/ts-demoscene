/*
 * @file    fadein.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade-In transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "../surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export class FadeIn extends ITransition {

    //----- methods
    constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
        super('fadein', display, refimage, delay, viewport);
    }

    // compute the new values for RGBA
    protected compute(values: number[]): number[] {
        let [ r, g, b, a, t ] = values;
        return [ lerp(0, r, t), lerp(0, g, t), lerp(0, b, t), lerp(0, a, t) ];
    }
}
