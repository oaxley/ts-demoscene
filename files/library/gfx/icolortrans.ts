/*
 * @file    transition.ts
 * @author  Sebastien LEGRAND
 *
 * @file    Abstract class to define color transition effects
 */

//----- imports
import { Rect } from "library/core/interfaces";
import { IStateTask, States } from "library/core/manager";
import { Surface } from "library/gfx/surface";
import { Viewport } from "./viewport";


//----- class
export abstract class IColorTransition extends IStateTask {

    //----- members
    protected display_ : Surface;       // the surface where the animation will be shown
    protected refimage_: Surface;       // the reference image
    protected delay_   : number;        // maximum time to play the effect
    protected start_   : number;        // start time of the effect
    private viewport_  : Viewport;      // effect viewport


    //----- methods
    constructor(name: string, display: Surface, refimage: Surface, delay: number, viewport?: Viewport) {
        super(name);

        // set the vars
        this.display_ = display;
        this.refimage_= refimage;
        this.delay_   = delay;
        this.start_   = -1;

        if (viewport === undefined) {
            this.viewport_ = new Viewport();
        } else {
            this.viewport_ = viewport;
        }
    }

    // update the animation
    public update(time: number): States {
        // initialize the start time
        if (this.start_ == -1) {
            this.start_ = time;
        }

        // compute the current time until the end
        let t = (time - this.start_) / this.delay_;
        if (t >= 1.0) {
            return States.S_END;
        }

        // viewport parameters
        let values: Rect = {x: 0, y: 0, w: this.display_.width, h: this.display_.height};
        if (this.viewport_.isEnabled) {
            values = this.viewport_.view;
        }

        // effect takes place only within the viewport
        const dw = this.display_.width;
        for (let y = values.y; y < (values.y + values.h); y++) {
            let offset = y * dw;

            this.refimage_.address = offset + values.x;
            this.display_.address  = offset + values.x;

            for (let x = values.x; x < (values.x + values.w); x++) {
                // compute the effect
                let rgba = this.refimage_.streamW;
                rgba = this.compute(t, rgba);
                this.display_.streamW = rgba;
            }
        }
        return States.S_RUNNING;
    }

    // setup and cleanup are not in used
    public setup(): void {}
    public cleanup(): void {}

    // just call the effect update
    public run(time: number): States {
        return this.update(time);
    }

    // this should be implementer by the effect
    protected abstract compute(time: number, value: number): number;
}
