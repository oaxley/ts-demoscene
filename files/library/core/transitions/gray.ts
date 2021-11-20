/*
 * @file    gray.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Gray In/Out transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "library/gfx/surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export namespace Gray {

    // make the transition from the reference image to gray
    export class In extends ITransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('gray-in', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
            return [ lerp(r, lum, t), lerp(g, lum, t), lerp(b, lum, t), a ];
        }
    }

    // make the transition from gray to the reference image
    export class Out extends ITransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('gray-out', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
            return [ lerp(lum, r, t), lerp(lum, g, t), lerp(lum, b, t), a ];
        }
    }

}
