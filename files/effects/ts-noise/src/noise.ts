/*
 * @file    noise.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Apparition effect with 2D noise
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { runInThisContext } from "vm";


//----- class
export class ImgNoise extends IAnimation {

    //----- members

    //----- methods
    // constructor
    constructor(display: Display) {
        super('imgnoise', display);
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();
    }

    // setup function
    public setup(): void {
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number | undefined): States {
        // update and render
        this.update(time);
        this.render(time);

        // this animation will run indefinetely
        return States.S_RUNNING;
    }
}