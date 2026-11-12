/*
 * @file    moire.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Moire effect
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { RGBA } from "library/color/RGBA";

//----- globals
const FPS = 25;

//----- class
export class Moire extends IAnimation {
    //----- members
    private dx1_: Float64Array; // squared X distances to circle #1 (scratch)
    private dx2_: Float64Array; // squared X distances to circle #2 (scratch)

    private sx_: number; // screen center X
    private sy_: number; // screen center Y

    private ax_: number; // amplitude X for circle movements
    private ay_: number; // amplitude Y for circle movements

    //----- methods
    constructor(display: Display) {
        super("moire", display, FPS);

        // set the vars
        this.dx1_ = new Float64Array(display.width);
        this.dx2_ = new Float64Array(display.width);
        this.sx_ = display.width >> 1;
        this.sy_ = display.height >> 1;
        this.ax_ = display.width >> 2;
        this.ay_ = display.height >> 2;
    }

    // update the animation
    protected update(time: number): void {
        const w = this.display_.width;
        const h = this.display_.height;
        const data32 = this.display_.surface.data32;
        const black = RGBA.toUInt32(0, 0, 0);
        const white = RGBA.toUInt32(255, 255, 255);

        // compute the current center of each circles
        const cx1 = this.sx_ + this.ax_ * Math.cos(time / 1000);
        const cy1 = this.sy_ + this.ay_ * Math.sin(time / 2000);
        const cx2 = this.sx_ + this.ax_ * Math.cos(time / 3000);
        const cy2 = this.sy_ + this.ay_ * Math.sin(time / 4000);

        // X coefficients (per column)
        const dx1 = this.dx1_;
        const dx2 = this.dx2_;
        for (let x = 0; x < w; x++) {
            dx1[x] = (x - cx1) * (x - cx1);
            dx2[x] = (x - cx2) * (x - cx2);
        }

        // draw the effect on the buffer
        let addr = 0;
        for (let y = 0; y < h; y++) {
            // Y coefficients
            const dy1 = (y - cy1) * (y - cy1);
            const dy2 = (y - cy2) * (y - cy2);

            for (let x = 0; x < w; x++) {
                // distance for both circles
                const dt1 = Math.sqrt(dx1[x] + dy1);
                const dt2 = Math.sqrt(dx2[x] + dy2);

                // compute the black or white "color" and write it in the frame buffer
                data32[addr++] = ((dt1 ^ dt2) >> 4) & 0x01 ? white : black;
            }
        }
    }
}
