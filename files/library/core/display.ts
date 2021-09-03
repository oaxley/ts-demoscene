/*
 * @file    display.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Define a Display where the animation is shown to end user
 */

//----- imports
import { Surface } from "./surface";


//----- class
export class Display {
    //----- members
    private screen_: HTMLCanvasElement;
    private context_: CanvasRenderingContext2D;
    private surface_: Surface;


    //----- methods
    constructor(canvas: HTMLCanvasElement) {
        this.screen_  = canvas;
        this.context_ = canvas.getContext("2d");
        this.surface_ = new Surface({width: canvas.width, height: canvas.height});
    }

    public get width(): number {
        return this.screen_.width;
    }

    public get height(): number {
        return this.screen_.height;
    }

    public draw() {
        this.context_.drawImage(this.surface_.canvas, 0, 0);
    }

    public get surface(): Surface {
        return this.surface_;
    }

    public get screen(): HTMLCanvasElement {
        return this.screen_;
    }

    public clear() {
        this.context_.clearRect(0, 0, this.screen_.width, this.screen_.height);
    }
}