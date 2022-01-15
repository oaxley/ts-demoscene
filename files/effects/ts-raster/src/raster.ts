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


//----- interfaces
interface IBar {
    angle: number,
    increment: number,
    color(index: number): RGBA;
}


//----- class
export class RasterBars extends IAnimation {

    //----- members
    private image_: Surface;            // front image
    private bars_: Array<IBar>;         // the raster bar interface

    //----- methods
    constructor(display: Display) {
        super('rasterbars', display);

        // initialize members
        this.image_ = new Surface();

        this.bars_ = [
            // Red bar
            {
                angle: 0.00,
                increment: 0.02,
                color: (index: number) => {
                    let v = Math.min(index * 10, 255);
                    return new RGBA(v, 0, 0);
                }
            }
        ]
    }

    // draw a bar on the surface display
    private drawBar(y: number, bar: number): void {
        let xmin = 0;
        let xmax = this.display_.width;

        // bars are 50 pixels wide
        for (let i = 0; i < 25; i++) {
            let ymin = y - (24 - i);
            let ymax = y + i;

            this.display_.surface.hline({x: xmin, y: ymin}, {x: xmax, y: ymin}, this.bars_[bar].color(i));
            this.display_.surface.hline({x: xmin, y: ymax}, {x: xmax, y: ymax}, this.bars_[bar].color(24 - i));
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        this.drawBar(this.display_.height >> 1, 0);
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