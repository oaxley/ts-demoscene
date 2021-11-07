/*
 * @file    fadeout.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade-Out transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "../surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export class FadeOut extends ITransition {

    //----- methods
    constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
        super('fadeout', display, refimage, delay, viewport);
    }

    // compute the new values for RGBA
    protected compute(values: number[]): number[] {
        let [ r, g, b, a, t ] = values;
        return [ lerp(r, 0, t), lerp(g, 0, t), lerp(b, 0, t), a ];
    }
}
