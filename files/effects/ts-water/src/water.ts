/*
 * @file    water.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Water effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";

import { Surface } from "library/gfx/surface";


//----- class
export class Water extends IAnimation {

    //----- members
    private image_: Surface;

    private state1_: Array<number>;
    private state2_: Array<number>;
    private state_: number;


    //----- methods
    constructor(display: Display) {
        super('water', display);

        // set the vars
        this.image_ = new Surface();

        let bsize    = this.width_ * this.height_;
        this.state1_ = new Array(bsize).fill(0);
        this.state2_ = new Array(bsize).fill(0);
        this.state_  = 0;
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation onto the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;
    }

    // setup function
    public setup(): void {
        this.image_
            .loadImage('/images/assets/ts-water.asset.png')
            .then(result => {
                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                };

                console.log('Starting the Water animation');
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number | undefined): States {
        // update and render the animation
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}