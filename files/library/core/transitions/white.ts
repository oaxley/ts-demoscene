/*
 * @file    white.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade to White transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "../surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export class FadeWhite extends ITransition {

    //----- methods
    constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
        super('fade-white', display, refimage, delay, viewport);
    }

    // compute the new values for RGBA
    protected compute(values: number[]): number[] {
        let [ r, g, b, a, t ] = values;
        return [ lerp(r, 255, t), lerp(g, 255, t), lerp(b, 255, t), a ];
    }
}
