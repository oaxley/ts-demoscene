/*
 * @file    display.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Define a Display where the animation is shown to end user
 */

//----- imports
import e from "express";
import { Surface } from "library/gfx/surface";


//----- globals

// enum for snapshot function
export enum EDisplaySource {
    E_DISPLAY = 0,
    E_BUFFER
}


//----- class
export class Display {
    //----- members
    private screen_  : HTMLCanvasElement;               // display screen canvas
    private context_ : CanvasRenderingContext2D;        // display screen context
    private width_   : number;                          // display width
    private height_  : number;                          // display height

    private surface_ : Surface;                         // back-buffer surface
    private snapshot_: Surface;                         // snapshot surface


    //----- methods
    constructor(canvas: HTMLCanvasElement) {
        // set the vars
        this.screen_  = canvas;
        this.context_ = canvas.getContext("2d")!;
        this.width_   = canvas.width;
        this.height_  = canvas.height;

        this.surface_ = new Surface({width: canvas.width, height: canvas.height});
        this.snapshot_= new Surface();
    }

    //----- accessors

    // accessor to get the display width
    public get width(): number {
        return this.width_;
    }

    // accessor to get the display height
    public get height(): number {
        return this.height_;
    }

    // retrieve the screen canvas element
    public get screen(): HTMLCanvasElement {
        return this.screen_;
    }

    // retrieve the screen context
    public get context(): CanvasRenderingContext2D {
        return this.context_;
    }

    // retrieve the display back-buffer
    public get surface(): Surface {
        return this.surface_;
    }

    // retrieve the snaphot surface
    public get snapshot(): Surface {
        return this.snapshot_;
    }

    //----- functions

    // draw the back-buffer on the screen canvas
    public draw() {
        this.context_.putImageData(this.surface_.image, 0, 0);
    }

    // take a snapshot of the display screen/back-buffer
    public takeSnapshot(value: EDisplaySource = EDisplaySource.E_BUFFER): void {
        if (value == EDisplaySource.E_DISPLAY) {
            let imgdata = this.context_.getImageData(0, 0, this.width_, this.height_);
            this.snapshot_.image = imgdata;
        } else {
            this.snapshot_.copy(this.surface_);
        }
    }

    // clear the screen
    public clear() {
        this.context_.clearRect(0, 0, this.screen_.width, this.screen_.height);
    }
}