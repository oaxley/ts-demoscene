/*
 * @file    twister.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Twister effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";
import { radians } from "library/maths/utils";
import { Surface } from "library/gfx/surface";
import { Size } from "library/core/interfaces";


//----- globals
const BAR_WIDTH = 240;


//----- class
export class Twister extends IAnimation {

    //----- members
    private angle_    : number;             // rotation angle
    private amplitude_: number;             // movement amplitude
    private ampway_   : number;             // movement way

    private texture_ : Surface;             // texture surface
    private slice_   : Size;                // texture slice size

    //----- methods
    constructor(display: Display) {
        super('twister', display);

        // set the vars
        this.angle_ = 0;
        this.amplitude_ = 0;
        this.ampway_ = 0.05;
        this.texture_ = new Surface();
        this.slice_ = { width: 0, height: 0}
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // setup vars
        let x0 = this.display_.width >> 1;
        let w  = BAR_WIDTH >> 1;

        // erase the surface
        this.display_.surface.clear({x:200, y:0, w:250, h:480});

        // activate the framebuffer
        this.display_.surface.framebuffer = true;

        for (let y = 0; y < this.display_.height; y++) {
            let fv = 1.0 * y / this.display_.height;

            // compute the position of each point
            let a = radians(90);
            let x1 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 0));
            let x2 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 1));
            let x3 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 2));
            let x4 = x0 + (w * Math.sin(this.amplitude_ * fv + this.angle_ + a * 3));

            // compute the texture coordinate / offset
            let yt = Math.floor(fv * this.texture_!.height);
            let ot = yt * this.texture_!.width;

            // draw the lines
            if (x1 < x2) {
                // xt begin/end for this slice
                let xtb = this.slice_.width * 0;
                let xte = xtb + this.slice_.width;

                this.display_.surface.frameAddr = (y * this.display_.width + x1);
                let ratio = (xte - xtb) / (x2 - x1);
                let addr = ot + xtb;

                for (let x = x1; x < x2; x++) {
                    this.texture_.frameAddr = addr;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    addr += ratio;
                }
            }

            if (x2 < x3) {
                // xt begin/end for this slice
                let xtb = this.slice_.width * 1;
                let xte = xtb + this.slice_.width;

                // let offset = (y * this.display_.width + x2) << 2;
                this.display_.surface.frameAddr = (y * this.display_.width + x2);
                let ratio = (xte - xtb) / (x3 - x2);
                let addr = ot + xtb;

                for (let x = x2; x < x3; x++) {
                    this.texture_.frameAddr = addr;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    addr += ratio;
                }
            }

            if (x3 < x4) {
                // xt begin/end for this slice
                let xtb = this.slice_.width * 2;
                let xte = xtb + this.slice_.width;

                // let offset = (y * this.display_.width + x3) << 2;
                this.display_.surface.frameAddr = (y * this.display_.width + x3);
                let ratio = (xte - xtb) / (x4 - x3);
                let addr = ot + xtb;

                for (let x = x3; x < x4; x++) {
                    this.texture_.frameAddr = addr;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    addr += ratio;
                }
            }

            if (x4 < x1) {
                // xt begin/end for this slice
                let xtb = this.slice_.width * 3;
                let xte = xtb + this.slice_.width;

                // let offset = (y * this.display_.width + x4) << 2;
                this.display_.surface.frameAddr = (y * this.display_.width + x4);
                let ratio = (xte - xtb) / (x1 - x4);
                let addr = ot + xtb;

                for (let x = x4; x < x1; x++) {
                    this.texture_.frameAddr = addr;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    this.display_.surface.frameStream = this.texture_.frameStream;
                    addr += ratio;
                }
            }
        }

        this.display_.surface.framebuffer = false;
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // update the angle
        this.angle_ += 0.035;

        // update the amplitude every 50 frames
        if (this.frames_ % 50 == 0) {
            this.amplitude_ += this.ampway_;
            if ((this.amplitude_ <= 0) || (this.amplitude_ > 1.8))
                this.ampway_ *= -1;
        }

        // flip the back-buffer onto the screen
        this.display_.clear();
        this.display_.draw();

        // increase the frames count
        this.frames_++;
    }

    // setup function
    public setup(): void {

        // load the texture
        this.texture_
            .loadImage('/images/assets/ts-twister.asset.jpg')
            .then(result => {
                // set the slice size
                this.slice_ = {
                    width: this.texture_.width >> 2,
                    height: this.texture_.height
                }

                // activate the access to the texture framebuffer
                this.texture_.framebuffer = true;

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting the Twister animation.");
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number): States {

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}