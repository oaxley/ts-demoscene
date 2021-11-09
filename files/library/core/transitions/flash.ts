/*
 * @file    flash.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Do a color flash
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "../surface";
import { Rect } from "../interfaces";


//----- class
export namespace Flash {

    // flash the reference image to white
    export class White extends ITransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('flash-white', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            if ((t > 0.2) && (t < 0.8)) {
                return [ 255, 255, 255, a];
            } else {
                return [ r, b, g, a ]
            }
        }
    }
}