/*
 * @file    metaballs.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Metaballs effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";


//----- class
export class Metaballs extends Animation {

    //----- members
    private display_ : Display;
    private palette_ : Palette;

    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;

        // create the grayscale palette
        this.createPalette();
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

    // run the animation
    public run(): void {
        console.log("Starting the Metaballs animation.");

        // toggle the animation
        this.toggle();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // main animation function
    protected main(timestamp: number): void {
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}