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


//----- globals
const BAR_SIZE = 50;


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

        const half_size = (BAR_SIZE >> 1) - 1;
        for (let i = 0; i <= half_size; i++) {
            let ymin = y - (half_size - i);
            let ymax = y + i;

            this.display_.surface.hline({x: xmin, y: ymin}, {x: xmax, y: ymin}, this.bars_[bar].color(i));
            this.display_.surface.hline({x: xmin, y: ymax}, {x: xmax, y: ymax}, this.bars_[bar].color(half_size - i));
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // clear the screen
        this.display_.surface.clear()

        // draw all the bars in reverse order to create "depth" impression
        let ymax = this.display_.height >> 1;
        let size = ymax - BAR_SIZE;

        for (let i = this.bars_.length - 1; i >= 0; i--) {
            // compute the bar position
            let ypos  = Math.floor(ymax + size * Math.sin( this.bars_[i].angle ))

            // draw the bar
            this.drawBar(ypos, i);

            // increment the angle value for this bar
            this.bars_[i].angle += this.bars_[i].increment;
            if (this.bars_[i].angle > 2*Math.PI)
                this.bars_[i].angle = 0;
        }
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