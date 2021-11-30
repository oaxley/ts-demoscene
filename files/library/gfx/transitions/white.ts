/*
 * @file    white.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   White In/Out transition effect
 */

//----- imports
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { lerp } from "library/maths/utils";
import { IColorTransition } from "../icolortrans";
import { Viewport } from "../viewport";


//----- class
export namespace White {

    // make the transition from the reference image to white
    export class In extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('white-in', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            return  RGBA.toUInt32(lerp(r, 255, time), lerp(g, 255, time), lerp(b, 255, time), a);
        }
    }

    // make the transition from white to reference image
    export class Out extends IColorTransition {

        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('white-out', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            return RGBA.toUInt32(lerp(255, r, time), lerp(255, g, time), lerp(255, b, time), a);
        }
    }

}
