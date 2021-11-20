/*
 * @file    fade.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade In/Out transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "library/gfx/surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export namespace Fade {

    // fade-in effect
    export class In extends ITransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('fadein', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            return [ lerp(0, r, t), lerp(0, g, t), lerp(0, b, t), a ];
        }
    }

    // fade-out effect
    export class Out extends ITransition {

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

}
