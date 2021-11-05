/*
 * @file    moire.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Moire effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";


//----- globals
const FPS = 25;
const TICKS = 1000 / FPS;


//----- class
export class Moire extends IAnimation {

    //----- members
    private lastTs_ : number;

    private sx_: number;            // screen center X
    private sy_: number;            // screen center Y

    private ax_: number;            // amplitude X for circle movements
    private ay_: number;            // amplitude Y for circle movements


    //----- methods
    constructor(display: Display) {
        super('moire', display);

        // set the vars
        this.lastTs_ = -1;

        this.sx_ = display.width >> 1;
        this.sy_ = display.height >> 1;
        this.ax_ = display.width >> 2;
        this.ay_ = display.height >> 2;
    }

    // update the animation
    protected update(time: number): void {
        if (!this.isAnimated)
            return;

        // we will write directly in the frame buffer
        let imgdata = this.display_.surface.data;

        // compute the current center of each circles
        let cx1 = this.sx_ + this.ax_ * Math.cos(time/1000);
        let cy1 = this.sy_ + this.ay_ * Math.sin(time/2000);
        let cx2 = this.sx_ + this.ax_ * Math.cos(time/3000);
        let cy2 = this.sy_ + this.ay_ * Math.sin(time/4000);

        // draw the effect on the buffer
        let offset = 0;
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
                imgdata.data[offset++] = v;
                imgdata.data[offset++] = v;
                imgdata.data[offset++] = v;
                imgdata.data[offset++] = 255;
            }
        }

        this.display_.surface.data = imgdata;
    }

    // render the animation on screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // setup function
    public setup(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }

        console.log("Starting 'Moire' animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // main animation function
    public run(time: number): States {

        // initialize the value on first call
        if (this.lastTs_ == -1) {
            this.lastTs_ = time;
        }

        // ensure the animation is runned at constant frame rate
        if ( (time - this.lastTs_) > TICKS ) {
            this.update(time);
            this.render(time);

            this.lastTs_ = time;
        }

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}