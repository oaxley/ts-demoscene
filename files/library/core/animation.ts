/*
 * @file    animation.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Animation class
 */

//----- imports
import { IStateTask } from "./manager";
import { Display } from "./display";


//----- class
export abstract class IAnimation extends IStateTask {

    //----- members
    private animated_: boolean;         // =true when the animation is running

    protected display_: Display;        // the display screen where the animation is shown
    protected frames_: number;          // number of frames rendered


    //----- methods
    constructor(name: string, display: Display) {
        super(name);

        // set the vars
        this.animated_ = false;
        this.display_ = display;
        this.frames_ = 0;
    }

    // toggle the animation
    public toggle(): void {
        this.animated_ = !this.animated_;
        if ( !this.animated_ ) {
            console.log('Animation stopped.');
        }
        else {
            console.log('Animation started.');
        }
    }

    // return the animation state
    public get isAnimated(): boolean {
        return this.animated_;
    }

    // update the animation
    protected abstract update(time: number|undefined): void;

    // render the animation on the screen
    protected abstract render(time: number|undefined): void;
}