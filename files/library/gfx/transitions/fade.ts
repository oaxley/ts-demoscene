/*
 * @file    fade.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Fade In/Out transition effect
 */

//----- imports
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { lerp } from "library/maths/utils";
import { IColorTransition } from "../icolortrans";
import { Viewport } from "../viewport";


//----- class
export namespace Fade {

    // fade-in effect
    export class In extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('fadein', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            return RGBA.toUInt32(lerp(0, r, time), lerp(0, g, time), lerp(0, b, time), a);
        }
    }

    // fade-out effect
    export class Out extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('fadeout', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            return  RGBA.toUInt32(lerp(r, 0, time), lerp(g, 0, time), lerp(b, 0, time), a);
        }
    }

}
