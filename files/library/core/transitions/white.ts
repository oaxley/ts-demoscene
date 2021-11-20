/*
 * @file    white.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   White In/Out transition effect
 */

//----- imports
import { ITransition } from "../transition";
import { Surface } from "library/gfx/surface";
import { Rect } from "../interfaces";
import { lerp } from "library/maths/utils";


//----- class
export namespace White {

    // make the transition from the reference image to white
    export class In extends ITransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('white-in', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            return [ lerp(r, 255, t), lerp(g, 255, t), lerp(b, 255, t), a ];
        }
    }

    // make the transition from white to reference image
    export class Out extends ITransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('white-out', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            return [ lerp(255, r, t), lerp(255, g, t), lerp(255, b, t), a ];
        }
    }

}
