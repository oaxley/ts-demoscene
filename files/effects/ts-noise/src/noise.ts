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

    //----- methods
    // constructor
    constructor(display: Display) {
        super('imgnoise', display);

        this.image_ = new Surface();

        // build the noise map
        let noise = new Noise.Noise2D();
        this.noiseMap_ = noise.fractal(display.width, display.height, Math.random() / 10.0);
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
        // load the asset images
        this.image_
            .loadImage('/images/assets/ts-noise.asset.png')
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