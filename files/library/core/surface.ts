/*
 * @file    surface.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   A drawing surface
 */

//----- imports
import { Size, Rect, Point2D } from "./interfaces";


//----- class
export class Surface {
    //----- members
    private width_: number;
    private height_: number;

    private canvas_: HTMLCanvasElement;
    private context_: CanvasRenderingContext2D;


    //----- methods
    constructor(size: Size) {

        // create a new canvas element
        this.canvas_ = document.createElement("canvas")
        this.canvas_.width  = size.width;
        this.canvas_.height = size.height;

        // setup vars
        this.width_   = size.width;
        this.height_  = size.height;
        this.context_ = this.canvas_.getContext("2d");
    }

    public get context(): CanvasRenderingContext2D {
        return this.context_;
    }

    public get canvas(): HTMLCanvasElement {
        return this.canvas_;
    }

    public get size(): Size {
        return {
            width: this.width_,
            height: this.height_
        }
    }

    public get width(): number {
        return this.width;
    }

    public get height(): number {
        return this.height;
    }

    public get data(): ImageData {
        return this.context_.getImageData(0, 0, this.width_, this.height_);
    }

    public set data(image: ImageData) {
        this.context_.putImageData(image, 0, 0);
    }

    public clear(r?: Rect): void;
    public clear(xr?: number|Rect, y?: number, w?: number, h?:number): void {
        switch(typeof xr) {
            case "undefined":
                this.context_.clearRect(0, 0, this.width_, this.height_);
                break;
            case "number":
                this.context_.clearRect(xr, y, w, h);
                break;
            default:
                this.context_.clearRect(xr.x, xr.y, xr.w, xr.h);
        }
    }
}