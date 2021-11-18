/*
 * @file    surface.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   A drawing surface
 */

//----- imports
import { RGBA } from "library/color/RGBA";
import { Size, Rect, Point2D } from "library/core/interfaces";
import { Viewport } from "./viewport";


//----- class
export class Surface {
    //----- members
    private width_: number;                         // width
    private height_: number;                        // height

    private canvas_: HTMLCanvasElement;             // Canvas element
    private context_: CanvasRenderingContext2D;     // Canvas context

    private viewport_: Viewport;                    // the viewport for the rendering
    private framebuffer_: ImageData|undefined;      // frame-buffer for direct access rendering
    private fast_: boolean;                         // =true if the frame-buffer is activated


    //----- methods
    constructor(size: Size) {

        // create a new canvas element
        this.canvas_ = document.createElement("canvas")
        this.canvas_.width  = size.width;
        this.canvas_.height = size.height;

        // setup vars
        this.width_   = size.width;
        this.height_  = size.height;
        this.context_ = this.canvas_.getContext("2d")!;
        this.viewport_= new Viewport();

        this.framebuffer_ = undefined;
        this.fast_ = false;
    }

    //----- accessors

    // return the context for this Surface
    public get context(): CanvasRenderingContext2D {
        return this.context_;
    }

    // return the canvas element for this Surface
    public get canvas(): HTMLCanvasElement {
        return this.canvas_;
    }

    // return the dimensions for this Surface
    public get size(): Size {
        return {
            width: this.width_,
            height: this.height_
        }
    }

    // return the width for this Surface
    public get width(): number {
        return this.width_;
    }

    // return the height for this Surface
    public get height(): number {
        return this.height_;
    }

    // return the pixels data for this Surface
    public get data(): ImageData {
        return this.context_.getImageData(0, 0, this.width_, this.height_);
    }

    // set the pixels data for this Surface
    public set data(image: ImageData) {
        this.context_.putImageData(image, 0, 0);
    }

    // activate/deactivate the framebuffer
    public set framebuffer(v: boolean) {
        if (v) {
            this.framebuffer_ = this.context_.getImageData(0, 0, this.width_, this.height_);
        } else {
            this.context_.putImageData(this.framebuffer_!, 0, 0);
            this.framebuffer_ = undefined;
        }
    }

    //----- functions

    // clear the surface
    public clear(r?: Rect): void;
    public clear(xr?: number|Rect, y?: number, w?: number, h?:number): void {
        switch(typeof xr) {
            case "undefined":
                this.context_.clearRect(0, 0, this.width_, this.height_);
                break;
            case "number":
                this.context_.clearRect(xr, y!, w!, h!);
                break;
            default:
                this.context_.clearRect(xr.x, xr.y, xr.w, xr.h);
        }
    }

    // copy the data from another surface
    public copy(other: Surface): void {
        this.context_.drawImage(other.canvas_, 0, 0);
    }

    // get the color value for a pixel
    public getPixel(p: Point2D): RGBA
    {
        let addr = p.y * this.width_ + p.x;

        let r: number = this.framebuffer_!.data[addr + 0];
        let g: number = this.framebuffer_!.data[addr + 1];
        let b: number = this.framebuffer_!.data[addr + 2];
        let a: number = this.framebuffer_!.data[addr + 3];

        return new RGBA(r, g, b, a);
    }

    // set the color value of a pixel
    public setPixel(p: Point2D, c: RGBA): void {
        let addr = p.y * this.width_ + p.x;

        this.framebuffer_!.data[addr + 0] = c.red;
        this.framebuffer_!.data[addr + 1] = c.green;
        this.framebuffer_!.data[addr + 2] = c.blue;
        this.framebuffer_!.data[addr + 3] = c.alpha;
    }

    // draw a line with the Bresenham algorithm
    public line(p1: Point2D, p2: Point2D, c: RGBA): void {
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        this.setPixel({x: x, y: y}, c);

        if ( p1.x > p2.x )
            incrx = -1;
        if ( p1.y > p2.y )
            incry = -1;

        dx = Math.abs(p1.x - p2.x);
        dy = Math.abs(p1.y - p2.y);

        if ( dx > dy ) {
            delta = dx / 2;
            for (let i = 1; i <= dx; i++) {
                x += incrx;
                delta += dy;
                if ( delta >= dx ) {
                    delta -= dx;
                    y += incry;
                }
                this.setPixel({x: x, y: y}, c);
            }
        }
        else {
            delta = dy / 2;
            for (let i = 1; i <= dy; i++) {
                y += incry;
                delta += dx;
                if ( delta >= dy ) {
                    delta -= dy;
                    x += incrx;
                }
                this.setPixel({x: x, y: y}, c);
            }
        }
    }
}