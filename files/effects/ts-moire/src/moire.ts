/*
 * @file    moire.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Moire effect
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";


//----- globals
const FPS = 25;
const TICKS = 1000 / FPS;


//----- class
export class Moire extends Animation {

    //----- members
    private display_: Display;
    private lastTs_ : number;


    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
        this.lastTs_ = null;
    }

    // run the animation
    public run(): void {
        console.log("Starting the Moire animation.");

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

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increase frames count
        this.frames_++;
    }

    // main animation function
    protected main(timestamp: number): void {
        // initialize the value on first call
        if (this.lastTs_ == null) {
            this.lastTs_ = timestamp;
        }

        // ensure the animation is runned at constant frame rate
        if ( (timestamp - this.lastTs_) > TICKS ) {
            this.update(timestamp);
            this.render(timestamp);

            this.lastTs_ = timestamp
        }
        requestAnimationFrame(this.main.bind(this));
    }
}