/*
 * @file    gray.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Gray In/Out transition effect
 */

//----- imports
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { lerp } from "library/maths/utils";
import { IColorTransition } from "../icolortrans";
import { Viewport } from "../viewport";


//----- class
export namespace Gray {

    // make the transition from the reference image to gray
    export class In extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('gray-in', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
            return RGBA.toUInt32(lerp(r, lum, time), lerp(g, lum, time), lerp(b, lum, time), a);
        }
    }

    // make the transition from gray to the reference image
    export class Out extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('gray-out', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
            return RGBA.toUInt32(lerp(lum, r, time), lerp(lum, g, time), lerp(lum, b, time), a);
        }
    }

}
