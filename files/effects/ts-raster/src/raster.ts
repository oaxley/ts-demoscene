/*
 * @file    raster.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Raster bars effect
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { RGBA } from "library/color/RGBA";

//----- globals
const BAR_SIZE = 50;

//----- interfaces
interface IBar {
    angle: number;
    increment: number;
    color(index: number): RGBA;
}

//----- class
export class RasterBars extends IAnimation {
    //----- members
    private image_: Surface; // front image
    private bars_: Array<IBar>; // the raster bar interface

    //----- methods
    constructor(display: Display) {
        super("rasterbars", display);

        // initialize members
        this.image_ = new Surface();

        this.bars_ = [
            // Red bar
            {
                angle: 0.6,
                increment: 0.03,
                color: (index: number) => {
                    let v = Math.min(index * 10, 255);
                    return new RGBA(v, 0, 0);
                },
            },
            // Green bar
            {
                angle: 0.4,
                increment: 0.03,
                color: (index: number) => {
                    let v = Math.min(index * 10, 255);
                    return new RGBA(0, v, 0);
                },
            },
            // Yellow bar
            {
                angle: 0.2,
                increment: 0.03,
                color: (index: number) => {
                    let v = Math.min(index * 10, 255);
                    return new RGBA(v, v, 0);
                },
            },
            // Violet bar
            {
                angle: 0.0,
                increment: 0.03,
                color: (index: number) => {
                    let v = Math.min(index * 10, 255);
                    return new RGBA(v, 0, v);
                },
            },
        ];
    }

    // draw a bar on the surface display
    private drawBar(y: number, bar: number): void {
        let xmin = 0;
        let xmax = this.display_.width;

        const half_size = (BAR_SIZE >> 1) - 1;
        for (let i = 0; i <= half_size; i++) {
            let ymin = y - (half_size - i);
            let ymax = y + i;

            this.display_.surface.hline({ x: xmin, y: ymin }, { x: xmax, y: ymin }, this.bars_[bar].color(i));
            this.display_.surface.hline(
                { x: xmin, y: ymax },
                { x: xmax, y: ymax },
                this.bars_[bar].color(half_size - i),
            );
        }
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-raster.sprite.png");
    }

    // update the animation
    protected update(): void {
        // clear the screen
        this.display_.surface.clear();

        // draw all the bars in reverse order to create "depth" impression
        let ymax = this.display_.height >> 1;
        let size = ymax - BAR_SIZE;

        for (let i = this.bars_.length - 1; i >= 0; i--) {
            // compute the bar position
            let ypos = Math.floor(ymax + size * Math.sin(this.bars_[i].angle));

            // draw the bar
            this.drawBar(ypos, i);

            // increment the angle value for this bar
            this.bars_[i].angle += this.bars_[i].increment;
            if (this.bars_[i].angle > 2 * Math.PI) this.bars_[i].angle = 0;
        }

        // display the sprite on top
        let xpos = this.display_.width - this.image_.width;
        this.display_.surface.blend({ x: xpos, y: 0 }, this.image_);
    }

    // render the animation
    protected render(): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
