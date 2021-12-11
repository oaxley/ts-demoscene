/*
 * @file    sprites.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Sprites effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";


//----- globals


//----- class
export class Sprites extends IAnimation {

    //----- members

    //----- methods
    // constructor
    constructor(display: Display) {
        super('sprites', display);

        // set the vars
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        }

        console.log("Starting Sprites animation.");
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}