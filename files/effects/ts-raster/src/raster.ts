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
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";


//----- class
export class RasterBars extends IAnimation {

    //----- members
    private image_: Surface;    // front image


    //----- methods
    constructor(display: Display) {
        super('rasterbars', display);

        // initialize members
        this.image_ = new Surface();
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

        // flip the back-buffer onto the screen
        this.display_.draw();
    }

    // setup function
    public setup(): void {
        this.image_
            .loadImage('/images/assets/ts-raster.asset.png')
            .then(result => {
                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting the Raster Bars animation");
            });
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