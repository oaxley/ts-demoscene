/*
 * @file    noise.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Apparition effect with 2D noise
 */

//----- imports
import { IAnimation } from "library/core/animation";

import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";
import { Noise } from "library/maths/noise";

//----- class
export class ImgNoise extends IAnimation {
    //----- members
    private image_: Surface;
    private noiseMap_: Array<number>;

    private threshold_: number;
    private increment_: number;

    //----- methods
    // constructor
    constructor(display: Display) {
        super("imgnoise", display);

        this.image_ = new Surface();
        this.threshold_ = 1.0;
        this.increment_ = 0.005;

        // build the noise map
        let noise = new Noise.Noise2D();
        this.noiseMap_ = noise.fractal(display.width, display.height, Math.random() / 10.0);
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.image_.loadImage("/images/assets/ts-noise.background.png");
    }

    // update the animation
    protected update(time?: number): void {
        const src = this.image_.data32;
        const dst = this.display_.surface.data32;
        const noise = this.noiseMap_;
        const threshold = this.threshold_;

        // go through the whole screen to trigger pixels
        for (let i = 0; i < dst.length; i++) {
            dst[i] = noise[i] >= threshold ? src[i] : 0;
        }

        // update the threshold for next frame
        this.threshold_ += this.increment_;
        if (this.threshold_ < 0.0 || this.threshold_ > 1.0) {
            this.increment_ *= -1;
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
