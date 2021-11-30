/*
 * @file    flash.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Do a color flash
 */

//----- imports
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { IColorTransition } from "../icolortrans";
import { Viewport } from "../viewport";


//----- class
export namespace Flash {

    // flash the reference image to white
    export class White extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('flash-white', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a] = RGBA.fromUInt32(value);;
            if ((time > 0.2) && (time < 0.8)) {
                return 0xFFFFFFFF;
            } else {
                return RGBA.toUInt32(r, g, b, a);
            }
        }
    }

    // flash the reference image to black
    export class Black extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('flash-black', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);;
            if ((time > 0.2) && (time < 0.8)) {
                return 0xFF000000;
            } else {
                return RGBA.toUInt32(r, g, b, a);
            }
        }
    }

    // flash the reference image to Gray
    export class Gray extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('flash-gray', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);;
            if ((time > 0.2) && (time < 0.8)) {
                let lum = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
                return RGBA.toUInt32(lum, lum, lum, a);
            } else {
                return RGBA.toUInt32(r, g, b, a);
            }
        }
    }

}