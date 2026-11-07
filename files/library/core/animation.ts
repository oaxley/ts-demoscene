/*
 * @file    animation.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Animation class
 *
 * Life cycle of an animation:
 *      setup()   : calls init() (assets loading, ...) then starts the
 *                  animation; a click on the window pauses/resumes it
 *      run(time) : called on every frame; when the animation is running,
 *                  calls update(time) then render(time) and increments the
 *                  frames counter. If a frame rate is given to the
 *                  constructor, frames are limited to this rate.
 *      cleanup() : nothing by default
 */

//----- imports
import { IStateTask, States } from "./manager";
import { Display } from "./display";

//----- class
export abstract class IAnimation extends IStateTask {
    //----- members
    private animated_: boolean; // =true when the animation is running
    private ticks_: number; // minimum time between two frames (ms), 0 = no limit
    private lastTs_: number; // timestamp of the last rendered frame

    protected display_: Display; // the display screen where the animation is shown
    protected width_: number; // the screen width
    protected height_: number; // the screen height

    protected frames_: number; // number of frames rendered

    //----- methods
    /* constructor
     *
     * Args:
     *      name    : animation name
     *      display : the display where the animation is shown
     *      fps     : (optional) maximum frame rate
     */
    constructor(name: string, display: Display, fps?: number) {
        super(name);

        // set the vars
        this.animated_ = false;
        this.ticks_ = fps === undefined ? 0 : 1000 / fps;
        this.lastTs_ = -1;
        this.frames_ = 0;
        this.display_ = display;
        this.width_ = display.width;
        this.height_ = display.height;
    }

    // toggle the animation
    public toggle(): void {
        this.animated_ = !this.animated_;
        if (!this.animated_) {
            console.log("Animation stopped.");
        } else {
            console.log("Animation started.");
        }
    }

    // return the animation state
    public get isAnimated(): boolean {
        return this.animated_;
    }

    // initialize the animation (load the assets, ...) before it starts
    protected init(): Promise<unknown> | void {}

    // start the animation
    private start(): void {
        // toggle the animation
        this.toggle();

        // set the click handler to pause the animation
        window.onclick = () => {
            this.toggle();
        };

        console.log(`Starting the '${this.name}' animation.`);
    }

    // setup function
    public setup(): void {
        const ready = this.init();
        if (ready) {
            ready.then(() => this.start());
        } else {
            this.start();
        }
    }

    // cleanup function
    public cleanup(): void {}

    // main loop
    public run(time: number | undefined): States {
        const ts = time ?? 0;

        // ensure the animation runs at a constant frame rate
        if (this.ticks_ > 0) {
            // initialize the value on first call
            if (this.lastTs_ == -1) {
                this.lastTs_ = ts;
            }

            if (ts - this.lastTs_ <= this.ticks_) {
                return States.S_RUNNING;
            }
            this.lastTs_ = ts;
        }

        // update & render the animation
        if (this.animated_) {
            this.update(ts);
            this.render(ts);
            this.frames_++;
        }

        // this animation will run indefinitely
        return States.S_RUNNING;
    }

    // update the animation
    protected abstract update(time: number): void;

    // render the animation on the screen
    protected abstract render(time: number): void;
}
