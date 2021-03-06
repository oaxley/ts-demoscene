/*
 * @file    plasma.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Plasma effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { COLOR_MODEL } from "library/color/basecolor";
import { RGBA } from "library/color/RGBA";
import { map } from "library/maths/utils";


//----- class
export class Plasma extends IAnimation {

    //----- members
    private palette_ : Palette;

    //----- methods
    constructor(display: Display) {
        super('plasma', display);

        // set the vars
        this.palette_ = new Palette();

        // create the 256 colors palette
        this.createPalette();
    }

    // create the color palette for the plasma
    private createPalette(): void {
        this.palette_ = new Palette();
        for (let i = 0; i < 256; i++) {
            let r = map(Math.sin(Math.PI * i / 16.0), -1, 1, 0, 255);
            let g = map(Math.sin(Math.PI * i / 128.0), -1, 1, 0, 255);
            let b = 0;

            this.palette_.setColor(i, new Color(COLOR_MODEL.RGBA, r, g, b));
        }
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // reset the frame-buffer address
        this.display_.surface.address = 0

        let time = timestamp / 500;
        for (let y = 0; y < this.display_.height; y++) {
            const dy = -0.5 + (y / this.display_.height);
            for (let x = 0; x < this.display_.width; x++) {
                const dx = -0.5 + (x / this.display_.width);

                const cx = dx + 0.5 * Math.sin(time / 7);
                const cy = dy + 0.5 * Math.cos(time / 5);

                let v = Math.sin(dx * 10 + time);
                v += Math.sin(Math.sqrt(75 * (cx * cx + cy * cy) + 1 + time));
                v += Math.cos(Math.sqrt(dx * dx + dy * dy) - time);
                v /= 3;

                let index = Math.floor(128 + 128 * v);
                if (index > 255)
                    index = 255;

                let rgba = <RGBA> this.palette_.getColor(index)!.color;
                this.display_.surface.streamW = rgba.uint32;
            }
        }
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

        console.log("Starting 'Plasma' animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // main animation function
    public run(time: number): States {

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}