/*
 * @file    white.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   White In/Out transition effect
 */

//----- imports
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";
import { IColorTransition } from "../icolortrans";
import { Viewport } from "../viewport";


//----- class
export namespace Filter {

    // Sepia Filter
    export class Sepia extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('sepia', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a ] = RGBA.fromUInt32(value);
            let tr = 0.393 * r + 0.769 * g + 0.189 * b;
            let tg = 0.349 * r + 0.686 * g + 0.168 * b;
            let tb = 0.272 * r + 0.534 * g + 0.131 * b;

            r = (tr > 255) ? 255 : tr;
            g = (tg > 255) ? 255 : tg;
            b = (tb > 255) ? 255 : tb;

            return RGBA.toUInt32(r, g, b, a);
        }
    }

    // Inverted colors
    export class Inverted extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super('inverted', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(time: number, value: number): number {
            let [ r, g, b, a, t ] = RGBA.fromUInt32(value);
            return RGBA.toUInt32(255-r, 255-g, 255-b, a);
        }
    }

}