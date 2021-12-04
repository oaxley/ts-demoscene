/*
 * @file    smoke.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Smoke effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { Surface } from "library/gfx/surface";


//----- globals


//----- class
export class Smoke extends IAnimation {

    //----- members
    private background_: Surface;
    private bgx0: number = 0;       // background X start position
    private bgy0: number = 0;       // background Y start position


    //----- methods
    // constructor
    constructor(display: Display) {
        super('smoke', display);

        // set the vars
        this.background_ = new Surface();
    }


    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // copy the background on the display surface
        this.display_.surface.clear();
        this.display_.surface.blend({x: this.bgx0, y: this.bgy0}, this.background_);
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        this.background_
            .loadImage('/images/assets/ts-smoke.background.png')
            .then(result => {

                // set the background position
                this.bgx0 = this.display_.width - this.background_.width;
                this.bgy0 = 0;

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting Smoke animation.");
        });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the effect
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}