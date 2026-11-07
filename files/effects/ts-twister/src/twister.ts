/*
 * @file    twister.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Twister effect
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { radians } from "library/maths/utils";
import { Surface } from "library/gfx/surface";
import { Size } from "library/core/interfaces";

//----- globals
const BAR_WIDTH = 240;

//----- class
export class Twister extends IAnimation {
    //----- members
    private angle_: number; // rotation angle
    private amplitude_: number; // movement amplitude
    private ampway_: number; // movement way

    private texture_: Surface; // texture surface
    private slice_: Size; // texture slice size

    //----- methods
    constructor(display: Display) {
        super("twister", display);

        // set the vars
        this.angle_ = 0;
        this.amplitude_ = 0;
        this.ampway_ = 0.05;
        this.texture_ = new Surface();
        this.slice_ = { width: 0, height: 0 };
    }

    /* draw a texture slice on a screen line (only if xb < xe: visible face)
     *
     * Args:
     *      y     : screen line
     *      ot    : offset of the texture line
     *      slice : slice index [0..3]
     *      xb, xe: begin / end X positions on the screen (not integers)
     */
    private drawSlice(y: number, ot: number, slice: number, xb: number, xe: number): void {
        if (xb >= xe) {
            return;
        }

        // xt begin/end for this slice
        const xtb = this.slice_.width * slice;
        const xte = xtb + this.slice_.width;

        const src = this.texture_.data32;
        const dst = this.display_.surface.data32;

        // same index truncation as the surface address accessors
        let d_addr = (y * this.display_.width + xb) << 2;
        let ratio = (xte - xtb) / (xe - xb);
        let addr = ot + xtb;

        for (let x = xb; x < xe; x++) {
            dst[d_addr >> 2] = src[(addr << 2) >> 2];
            d_addr += 4;
            addr += ratio;
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.texture_.loadImage("/images/assets/ts-twister.texture.jpg").then(() => {
            // set the slice size
            this.slice_ = {
                width: this.texture_.width >> 2,
                height: this.texture_.height,
            };
        });
    }

    // update the animation
    protected update(): void {
        // setup vars
        let x0 = this.display_.width >> 1;
        let w = BAR_WIDTH >> 1;

        // erase the surface
        this.display_.surface.clear();

        for (let y = 0; y < this.display_.height; y++) {
            let fv = (1.0 * y) / this.display_.height;

            // compute the position of each point
            let a = radians(90);
            let x1 = x0 + w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 0);
            let x2 = x0 + w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 1);
            let x3 = x0 + w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 2);
            let x4 = x0 + w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 3);

            // compute the texture coordinate / offset
            let yt = Math.floor(fv * this.texture_!.height);
            let ot = yt * this.texture_!.width;

            // draw the 4 slices
            this.drawSlice(y, ot, 0, x1, x2);
            this.drawSlice(y, ot, 1, x2, x3);
            this.drawSlice(y, ot, 2, x3, x4);
            this.drawSlice(y, ot, 3, x4, x1);
        }
    }

    // render the animation on the screen
    protected render(): void {
        // update the angle
        this.angle_ += 0.035;

        // update the amplitude every 50 frames
        if (this.frames_ % 50 == 0) {
            this.amplitude_ += this.ampway_;
            if (this.amplitude_ <= 0 || this.amplitude_ > 1.8) this.ampway_ *= -1;
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
