/*
 * @file    filters.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Color filters transitions (sepia, inverted, ...)
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
            super("sepia", display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(_time: number, value: number): number {
            const [r0, g0, b0, a] = RGBA.fromUInt32(value);
            const tr = 0.393 * r0 + 0.769 * g0 + 0.189 * b0;
            const tg = 0.349 * r0 + 0.686 * g0 + 0.168 * b0;
            const tb = 0.272 * r0 + 0.534 * g0 + 0.131 * b0;

            const r = tr > 255 ? 255 : tr;
            const g = tg > 255 ? 255 : tg;
            const b = tb > 255 ? 255 : tb;

            return RGBA.toUInt32(r, g, b, a);
        }
    }

    // Inverted colors
    export class Inverted extends IColorTransition {
        //----- methods
        constructor(display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
            super("inverted", display, refimage, delay, viewport);
        }

        // compute the new values for RGBA
        protected compute(_time: number, value: number): number {
            const [r, g, b, a] = RGBA.fromUInt32(value);
            return RGBA.toUInt32(255 - r, 255 - g, 255 - b, a);
        }
    }
}
