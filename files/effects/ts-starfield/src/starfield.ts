/*
 * @file    starfield.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Starfield effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";


//----- globals


//----- class
export class Starfield extends IAnimation {

    //----- members

    //----- methods
    constructor(display: Display) {
        super('starfield', display);
    }

    // update the animation
    protected update(time?: number): void {
    }

    // render the animation on the screen
    protected render(time?: number): void {
    }

    // setup function
    public setup(): void {
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time?: number): States {
        // update and render
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}