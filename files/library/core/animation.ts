/*
 * @file    animation.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Animation class
 */

//----- imports
import { IStateTask } from "./manager";

//----- class
export abstract class IAnimation extends IStateTask {
    //----- members
    private isAnimated_: boolean;       // =true when the animation is running
    protected frames_: number;          // number of frames rendered


    //----- methods
    constructor(name: string) {
        super(name);

        this.isAnimated_ = false;
        this.frames_ = 0;
    }

    // toggle the animation
    public toggle(): void {
        this.isAnimated_ = !this.isAnimated_;
        if ( !this.isAnimated_ ) {
            console.log('Animation stopped.');
        }
        else {
            console.log('Animation started.');
        }
    }

    // return the animation state
    public get isAnimated(): boolean {
        return this.isAnimated_;
    }

    // update the animation
    protected abstract update(timestamp: number): void;

    // render the animation on the screen
    protected abstract render(timestamp: number): void;
}