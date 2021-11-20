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
export namespace Filter {

    // Sepia Filter
    export class Sepia extends ITransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('sepia', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            let tr = 0.393 * r + 0.769 * g + 0.189 * b;
            let tg = 0.349 * r + 0.686 * g + 0.168 * b;
            let tb = 0.272 * r + 0.534 * g + 0.131 * b;

            r = (tr > 255) ? 255 : tr;
            g = (tg > 255) ? 255 : tg;
            b = (tb > 255) ? 255 : tb;

            return [ r, g, b, a ];
        }
    }

    // Inverted colors
    export class Inverted extends ITransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
            super('inverted', display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(values: number[]): number[] {
            let [ r, g, b, a, t ] = values;
            return [ 255-r, 255-g, 255-b, a ];
        }
    }

}