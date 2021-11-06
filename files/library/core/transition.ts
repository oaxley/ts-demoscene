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
