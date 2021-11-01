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
        this.context_ = canvas.getContext("2d")!;
        this.surface_ = new Surface({width: canvas.width, height: canvas.height});
    }

    // accessor to get the display width
    public get width(): number {
        return this.screen_.width;
    }

    // accessor to get the display height
    public get height(): number {
        return this.screen_.height;
    }

    // draw the display back surface on the canvas element
    public draw() {
        this.context_.drawImage(this.surface_.canvas, 0, 0);
    }

    // retrieve the display back surface
    public get surface(): Surface {
        return this.surface_;
    }

    // retrieve the screen canvas element
    public get screen(): HTMLCanvasElement {
        return this.screen_;
    }

    // clear the screen
    public clear() {
        this.context_.clearRect(0, 0, this.screen_.width, this.screen_.height);
    }

    // load an image on the display back Surface
    public loadImage(image: HTMLImageElement) {
        this.surface_.context.drawImage(image, 0, 0);
    }
}