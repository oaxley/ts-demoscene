/*
 * @file    plasma.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Plasma effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";


//----- class
export class Plasma extends Animation {

    //----- members
    private display_ : Display;
    private palette_ : Palette;

    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;

        // create the 256 colors palette
        this.createPalette();
    }

    // create the color palette for the plasma
    private createPalette(): void {
        this.palette_ = new Palette();
        for (let i = 0; i < 256; i++) {
            let r = Math.floor(128 + 128 * Math.sin(Math.PI * i / 16.0));
            let g = Math.floor(128 + 128 * Math.sin(Math.PI * i / 128.0));
            let b = 0;

            this.palette_.setColor(i, new Color(COLOR_MODEL.RGBA, r, g, b));
        }
    }

    // run the animation
    public run(): void {
        console.log("Starting the Lens animation.");

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