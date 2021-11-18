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
import { RGBA } from "library/color/RGBA";


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

        // set the vars
        this.palette_ = new Palette();
        this.metaballs_ = [];

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
        for (let index = 0; index < 256; index++) {
            let v = Math.floor(255.0 * this.ease(index / 256.0));
            this.palette_.setColor(index, new Color(COLOR_MODEL.RGBA, v, v, v));
        }
    }

    // create the metaballs particules
    private createParticules(): void {
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
    protected update(time?: number): void {
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
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // retrieve the pixels data from the back-buffer surface
        this.display_.surface.framebuffer = true;

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
                let color = <RGBA> this.palette_.getColor(sum)!.color;

                // set the pixel
                this.display_.surface.setPixel({x:x, y:y}, color);
            }
        }

        // copy back the pixels data to the surface
        this.display_.surface.framebuffer = false;

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

        console.log("Starting the Metaballs animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

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