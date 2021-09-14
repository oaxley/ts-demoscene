/*
 * @file    animation.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Animation class
 */

//----- imports


//----- class
export abstract class Animation {
    //----- members
    private isAnimated_: boolean;       // =true when the animation is running
    protected frames_: number;          // number of frames rendered


    //----- methods
    constructor() {
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

    // run the animation
    public abstract run(): void;

    // update the animation
    protected abstract update(timestamp: number): void;

    // render the animation on the screen
    protected abstract render(timestamp: number): void;

    // animation main function
    protected abstract main(timestamp: number): void;
}