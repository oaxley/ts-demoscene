/*
 * @file    raster.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Raster bars effect
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";

import { Display } from "library/core/display";


//----- class
export class RasterBars extends IAnimation {

    //----- members

    //----- methods
    constructor(display: Display) {
        super('rasterbars', display);
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // setup function
    public setup(): void {
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number | undefined): States {
        // update & render the animation
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}