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
        super('imgnoise', display);

        this.image_ = new Surface();
        this.threshold_ = 1.0;
        this.increment_ = 0.005;

        // build the noise map
        let noise = new Noise.Noise2D();
        this.noiseMap_ = noise.fractal(display.width, display.height, Math.random() / 10.0);
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;

        // retrieve src and dst image data
        let src_data = this.image_.image;
        let dst_data = this.display_.surface.image;

        // go through the whole screen to trigger pixels
        for (let y = 0; y < this.display_.height; y++) {
            let offset = y * this.display_.width;

            for (let x = 0; x < this.display_.width; x++) {
                let k = this.noiseMap_[ y * this.display_.width + x ];

                if ( k >= this.threshold_ ) {
                    dst_data.data[(offset << 2) + 0] = src_data.data[(offset << 2) + 0];
                    dst_data.data[(offset << 2) + 1] = src_data.data[(offset << 2) + 1];
                    dst_data.data[(offset << 2) + 2] = src_data.data[(offset << 2) + 2];
                    dst_data.data[(offset << 2) + 3] = src_data.data[(offset << 2) + 3];
                } else {
                    dst_data.data[(offset << 2) + 0] = 0;
                    dst_data.data[(offset << 2) + 1] = 0;
                    dst_data.data[(offset << 2) + 2] = 0;
                    dst_data.data[(offset << 2) + 3] = 0;
                }

                // next pixel
                offset++;
            }
        }

        // rewrite the display data
        this.display_.surface.image = dst_data;

        // update the threshold for next frame
        this.threshold_ += this.increment_;
        if ((this.threshold_ < 0.0) || (this.threshold_ > 1.0)) {
            this.increment_ *= -1;
        }
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
        // load the asset images
        this.image_
            .loadImage('/images/assets/ts-noise.background.png')
            .then(result => {
                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting the Noise animation");
            });
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