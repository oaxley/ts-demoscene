/*
 * @file    metaballs.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Metaballs effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";


//----- globals
const RADIUS: number = 60;
const RADIUS_INCREASE: number = 40;
const NUM_PARTICULES: number = 10;
const MAX_VELOCITY_X: number = 5;
const MAX_VELOCITY_Y: number = 5;
const COEFF: number = 40;


//----- interfaces
interface MetaParticule {
    x: number,              // X position
    y: number,              // Y position
    vx: number,             // X velocity
    vy: number,             // Y velocity
    r: number               // Radius
}


//----- class
export class Metaballs extends IAnimation {

    //----- members
    private palette_  : Palette;
    private metaballs_: MetaParticule[];


    //----- methods
    constructor(display: Display) {
        super('metaballs', display);

        // create the grayscale palette
        this.createPalette();

        // create the metaballs particules
        this.createParticules();
    }

    // ease function
    private ease(x: number): number {
        return x * x * x;
    }

    // create a grayscale palette
    private createPalette(): void {
        this.palette_ = new Palette();
        for (let index = 0; index < 256; index++) {
            let v = Math.floor(255.0 * this.ease(index / 256.0));
            this.palette_.setColor(index, new Color(COLOR_MODEL.RGBA, v, v, v));
        }
    }

    // create the metaballs particules
    private createParticules(): void {
        this.metaballs_ = [];
        for (let i = 0; i < NUM_PARTICULES; i++) {
            this.metaballs_.push(
                {
                    x: Math.floor(this.width_ * Math.random()),
                    y: Math.floor(this.height_ * Math.random()),
                    vx: MAX_VELOCITY_X * Math.random(),
                    vy: MAX_VELOCITY_Y * Math.random(),
                    r: Math.floor(RADIUS + RADIUS_INCREASE * Math.random())
                }
            )
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // move the particules around
        for (let k = 0; k < NUM_PARTICULES; k++) {
            this.metaballs_[k].x += this.metaballs_[k].vx;
            this.metaballs_[k].y += this.metaballs_[k].vy;

            if ((this.metaballs_[k].x < 0) || (this.metaballs_[k].x > this.width_))
                this.metaballs_[k].vx = -this.metaballs_[k].vx;

            if ((this.metaballs_[k].y < 0) || (this.metaballs_[k].y > this.height_))
                this.metaballs_[k].vy = -this.metaballs_[k].vy;
        }
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // retrieve the pixels data from the back-buffer surface
        let imgdata = this.display_.surface.data;

        // compute the effect
        for (let y = 0; y < this.height_; y++) {
            for (let x = 0; x < this.width_; x++) {

                // compute the interference between each particules
                let sum = 0;
                for (let k = 0; k < NUM_PARTICULES; k++) {

                    let d = Math.sqrt( (x - this.metaballs_[k].x) * (x - this.metaballs_[k].x) + (y - this.metaballs_[k].y) * (y - this.metaballs_[k].y) );
                    let c = Math.floor(COEFF * this.metaballs_[k].r / d);

                    sum += c;
                }

                if (sum > 255)
                    sum = 255;

                // retrieve the associated color from the palette
                let rgb = this.palette_.getColor(sum).color.values;

                // set the pixel
                let pos = (y * this.width_ + x) << 2;
                imgdata.data[pos + 0] = rgb.x;
                imgdata.data[pos + 1] = rgb.y;
                imgdata.data[pos + 2] = rgb.z;
                imgdata.data[pos + 3] = 255;
            }
        }

        // copy back the pixels data to the surface
        this.display_.surface.data = imgdata;

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
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {
        console.log("Starting the Metaballs animation.");

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }

    // main animation function
    protected main(timestamp: number): void {
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}