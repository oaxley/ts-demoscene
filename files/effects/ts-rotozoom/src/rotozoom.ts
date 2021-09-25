/*
 * @file    rotozoom.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Rotozoom effec
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { radians } from "library/maths/utils";


//----- class
export class Rotozoom extends Animation {

    //----- members
    private display_  : Display;
    private image_    : HTMLImageElement;

    private cos_ : number[];                        // cos lookup table
    private sin_ : number[];                        // sin lookup table


    //----- methods
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;

        // load the texture image
        this.image_ = new Image();
        this.image_.src = '/images/ts-rotozoom.asset.jpg';

        // load the lookup tables
        this.computeLUT();
    }

    // prepare the cos/sin tables
    private computeLUT(): void {
        this.cos_ = [];
        this.sin_ = [];

        for (let i = 0; i < 360; i++) {
            this.cos_[i] = Math.cos(radians(i));
            this.sin_[i] = Math.sin(radians(i));
        }
    }

    // run the animation
    public run(): void {
        console.log("Starting the Rotozoom animation.");

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
        this.update(timestamp);
        this.render(timestamp);
        requestAnimationFrame(this.main.bind(this));
    }
}