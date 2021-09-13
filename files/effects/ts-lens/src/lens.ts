/*
 * @file    lens.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";


//----- class
export class Lens extends Animation {

    //----- members
    private display_: Display;


    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
    }

    // run the animation
    public run(): void {
        console.log("Starting the Lens animation.");

        // toggle the animation
        this.toggle();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // render the animation on screen
    protected render(timestamp: number): void {
        if (!this.isAnimated)
            return;
    }

    // main animation function
    protected main(timestamp: number): void {
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}