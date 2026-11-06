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

    private sx_: number;            // screen center X
    private sy_: number;            // screen center Y

    private ax_: number;            // amplitude X for circle movements
    private ay_: number;            // amplitude Y for circle movements


    //----- methods
    constructor(display: Display) {
        super('moire', display, FPS);

        // set the vars
        this.sx_ = display.width >> 1;
        this.sy_ = display.height >> 1;
        this.ax_ = display.width >> 2;
        this.ay_ = display.height >> 2;
    }

    // update the animation
    protected update(time: number): void {
        // we will write directly in the frame buffer
        this.display_.surface.address = 0;

        // compute the current center of each circles
        let cx1 = this.sx_ + this.ax_ * Math.cos(time/1000);
        let cy1 = this.sy_ + this.ay_ * Math.sin(time/2000);
        let cx2 = this.sx_ + this.ax_ * Math.cos(time/3000);
        let cy2 = this.sy_ + this.ay_ * Math.sin(time/4000);

        // draw the effect on the buffer
        for (let y = 0; y < this.display_.height; y++) {

            // Y coefficients
            const dy1 = (y - cy1) * (y - cy1);
            const dy2 = (y - cy2) * (y - cy2);

            for (let x = 0; x < this.display_.width; x++) {
                // X coefficients
                const dx1 = (x - cx1) * (x - cx1);
                const dx2 = (x - cx2) * (x - cx2);

                // distance for both circles
                const dt1 = Math.sqrt(dx1 + dy1);
                const dt2 = Math.sqrt(dx2 + dy2);

                // compute the black or white "color"
                let v = 255 * (((dt1 ^ dt2) >> 4) & 0x01);

                // write the value inside the frane buffer
                this.display_.surface.streamW = RGBA.toUInt32(v, v, v);
            }
        }
    }

    // render the animation on screen
    protected render(time?: number): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}