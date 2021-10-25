/*
 * @file    tunnel.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Tunnel effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";


//----- globals


//----- class
export class Tunnel extends IAnimation {

    //----- members

    //----- methods
    // constructor
    constructor(display: Display) {
        super('tunnel', display);
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on the screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number | undefined): States {

        // update & render the tunnel effect
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}