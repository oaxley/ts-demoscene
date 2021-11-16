/*
 * @file    viewport.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   A Viewing region
 */

//----- imports
import { Rect } from "library/core/interfaces";


//----- class
export class Viewport {

    //----- members
    private x_: number;             // left corner X
    private y_: number;             // left corner Y
    private w_: number;             // width
    private h_: number;             // height

    private enabled_: boolean;      // =true if the viewport is active

    //----- methods
    constructor() {
        // set the vars
        [ this.x_, this.y_, this.w_, this.h_ ] = [ 0, 0, 0, 0 ];
        this.enabled_ = false;
    }

    //----- accessors
    // return the status of the viewport
    public get isEnabled(): boolean {
        return this.enabled_;
    }

    // get the viewport parameters
    public get view(): Rect {
        return {
            x: this.x_,
            y: this.y_,
            w: this.w_,
            h: this.h_
        }
    }

    // set the viewport parameters
    public set view(v: Rect) {
        [ this.x_, this.y_, this.w_, this.h_ ] = [ v.x, v.y, v.w, v.h ];
        this.enabled_ = true;
    }

    // reset the viewport
    public reset(): void {
        [ this.x_, this.y_, this.w_, this.h_ ] = [ 0, 0, 0, 0 ];
        this.enabled_ = false;
    }
}
