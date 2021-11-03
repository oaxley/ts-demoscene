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
    private animated_ : boolean;         // =true when the animation is running

    protected display_: Display;        // the display screen where the animation is shown
    protected width_  : number;         // the screen width
    protected height_ : number;         // the screen height

    protected frames_ : number;         // number of frames rendered


    //----- methods
    constructor(name: string, display: Display) {
        super(name);

        // set the vars
        this.animated_ = false;
        this.frames_   = 0;
        this.display_  = display;
        this.width_    = display.width;
        this.height_   = display.height;
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
    protected abstract update(time?: number): void;

    // render the animation on the screen
    protected abstract render(time?: number): void;
}