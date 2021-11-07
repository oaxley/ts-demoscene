/*
 * @file    transition.ts
 * @author  Sebastien LEGRAND
 *
 * @file    Abstract class to define transition effects
 */

//----- imports
import { IStateTask, States } from "./manager";
import { Surface } from "./surface";
import { Rect } from "./interfaces";


//----- class
export abstract class ITransition extends IStateTask {

    //----- members
    protected display_ : Surface;       // the surface where the animation will be shown
    protected refimage_: Surface;       // the reference image
    protected viewport_: Rect;          // viewport for the animation
    protected delay_   : number;        // maximum time to play the effect
    protected start_   : number;        // start time of the effect

    //----- methods
    constructor(name: string, display: Surface, refimage: Surface, delay: number, viewport?: Rect) {
        super(name);

        // set the vars
        this.display_ = display;
        this.refimage_= refimage;
        this.delay_   = delay;
        this.start_   = -1;

        if (viewport === undefined) {
            this.viewport_ = { x: 0, y: 0, w: display.width, h: display.height}
        } else {
            this.viewport_ = viewport;
        }
    }

    // update the animation
    public update(time: number): States {
        if (this.start_ == -1) {
            this.start_ = time;
        }

        // display parameters
        let dstdata = this.display_.data;
        const dw = this.display_.width;

        // reference image parameters
        let srcdata = this.refimage_.data

        // compute the current time until the end
        let t = (time - this.start_) / this.delay_;
        if (t >= 1.0) {
            return States.S_END;
        }

        // effect takes place only on the viewport
        for (let y = this.viewport_.y; y < (this.viewport_.y + this.viewport_.h); y++) {
            let offset = y * dw;

            for (let x = this.viewport_.x; x < (this.viewport_.x + this.viewport_.w); x++) {

                let addr = (offset + x) << 2;

                // retrieve the rgba parameters
                let r = srcdata.data[addr + 0];
                let g = srcdata.data[addr + 1];
                let b = srcdata.data[addr + 2];
                let a = srcdata.data[addr + 3];

                // compute the effect
                [r, g, b, a] = this.compute([r, g, b, a, t]);

                // store the new values
                dstdata.data[addr + 0] = Math.floor(r);
                dstdata.data[addr + 1] = Math.floor(g);
                dstdata.data[addr + 2] = Math.floor(b);
                dstdata.data[addr + 3] = Math.floor(a);
            }
        }

        this.display_.data = dstdata;

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
    protected abstract compute(values: number[]): number[];
}
