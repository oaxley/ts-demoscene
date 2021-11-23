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
import { lerp } from "library/maths/utils";


//----- class
export class Surface {
    //----- members
    private width_  : number;                               // width
    private height_ : number;                               // height
    private canvas_ : HTMLCanvasElement|undefined;          // Canvas element
    private context_: CanvasRenderingContext2D|undefined;   // Canvas context

    private viewport_: Viewport;                    // the viewport for the rendering
    private framebuffer_: ImageData|undefined;      // frame-buffer for direct access rendering
    private frameaddr_: number;                     // frame-buffer current address for stream operation


    //----- methods
    constructor(size?: Size) {

        // create a new canvas element
        if (size !== undefined) {
            this.canvas_ = document.createElement("canvas")
            this.canvas_.width  = size.width;
            this.canvas_.height = size.height;
            this.width_   = size.width;
            this.height_  = size.height;
            this.context_ = this.canvas_.getContext("2d")!;
        } else {
            this.width_  = 0;
            this.height_ = 0;
        }

        // setup vars
        this.viewport_= new Viewport();
        this.framebuffer_ = undefined;
        this.frameaddr_   = 0;
    }

    //----- accessors

    // return the context for this Surface
    public get context(): CanvasRenderingContext2D {
        return this.context_!;
    }

    // return the canvas element for this Surface
    public get canvas(): HTMLCanvasElement {
        return this.canvas_!;
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
        return this.context_!.getImageData(0, 0, this.width_, this.height_);
    }

    // set the pixels data for this Surface
    public set data(image: ImageData) {
        this.context_!.putImageData(image, 0, 0);
    }

    // activate/deactivate the framebuffer
    public set framebuffer(v: boolean) {
        if (v) {
            this.framebuffer_ = this.context_!.getImageData(0, 0, this.width_, this.height_);
        } else {
            this.context_!.putImageData(this.framebuffer_!, 0, 0);
            this.framebuffer_ = undefined;
        }
    }

    // set/get a byte in/from the framebuffer at the current address
    public set frameStream(value: number) {
        this.framebuffer_!.data[this.frameaddr_++] = value;
    }
    public get frameStream(): number {
        return this.framebuffer_!.data[this.frameaddr_++];
    }
    public set frameStreamW(value32: number) {
        this.framebuffer_!.data[this.frameaddr_++] = value32 & 0xff;
        this.framebuffer_!.data[this.frameaddr_++] = (value32 >>  8) & 0xff;
        this.framebuffer_!.data[this.frameaddr_++] = (value32 >> 16) & 0xff;
        this.framebuffer_!.data[this.frameaddr_++] = (value32 >> 24) & 0xff;
    }

    // reset or set the frame address
    public set frameAddr(value: number) {
        this.frameaddr_ = value << 2;
    }

    //----- functions

    // clear the surface
    public clear(r?: Rect): void;
    public clear(xr?: number|Rect, y?: number, w?: number, h?:number): void {
        switch(typeof xr) {
            case "undefined":
                this.context_!.clearRect(0, 0, this.width_, this.height_);
                break;
            case "number":
                this.context_!.clearRect(xr, y!, w!, h!);
                break;
            default:
                this.context_!.clearRect(xr.x, xr.y, xr.w, xr.h);
        }
    }

    // copy the data from another surface
    public copy(other: Surface): void {
        this.context_!.drawImage(other.canvas_!, 0, 0);
    }

    // load an image on this surface
    public loadImage(name: string): Promise<boolean> {
        let img = new Image();

        // prepare the future
        let future = new Promise((resolve, reject) => {
            img.onload = (event) => {
                resolve(true)
            };
            img.onerror = (event) => {
                reject("Could not load the image!");
            }
            img.src = name;
        });

        // execute the future
        return future.then((result) => {
            // recreate the element
            this.canvas_ = <HTMLCanvasElement> document.createElement("canvas");
            this.canvas_.width  = img.width;
            this.canvas_.height = img.height;
            this.width_  = img.width;
            this.height_ = img.height;

            this.context_= <CanvasRenderingContext2D> this.canvas_.getContext("2d");

            // load the image onto it
            this.context_.globalCompositeOperation = 'source-over';
            this.context_.drawImage(img, 0, 0);

            // success
            return true;
        }).catch((message) => {
            console.log(message);
            return false;
        });
    }

    // get the color value for a pixel
    public getPixel(p: Point2D): RGBA
    {
        let addr = (p.y * this.width_ + p.x) << 2;

        let r: number = this.framebuffer_!.data[addr + 0];
        let g: number = this.framebuffer_!.data[addr + 1];
        let b: number = this.framebuffer_!.data[addr + 2];
        let a: number = this.framebuffer_!.data[addr + 3];

        return new RGBA(r, g, b, a);
    }

    // set the color value of a pixel
    public setPixel(p: Point2D, c: RGBA): void {
        let addr = (p.y * this.width_ + p.x) << 2;

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

    // optimized algorithm for horizontal line
    public hline(p1: Point2D, p2: Point2D, c: RGBA): void {
        let x1 = p1.x;
        let x2 = p2.x;

        // swap both values if needed
        if (x1 > x2) {
            [x1, x2] = [x2, x1];
        }

        let addr = p1.y * this.width_ + x1;
        for (let i = x1; i <= x2; i++, addr += 4) {
            this.framebuffer_!.data[addr + 0] = c.red;
            this.framebuffer_!.data[addr + 1] = c.green;
            this.framebuffer_!.data[addr + 2] = c.blue;
            this.framebuffer_!.data[addr + 3] = c.alpha;
        }
    }

    // optimized algorithm for vertical line
    public vline(p1: Point2D, p2: Point2D, c: RGBA): void {
        let y1 = p1.y;
        let y2 = p2.y;

        // swap both values if needed
        if (y1 > y2) {
            [y1, y2] = [y2, y1];
        }

        let addr = y1 * this.width_ + p1.x;
        for (let i = y1; i <= y2; i++, addr += this.width_) {
            this.framebuffer_!.data[addr + 0] = c.red;
            this.framebuffer_!.data[addr + 1] = c.green;
            this.framebuffer_!.data[addr + 2] = c.blue;
            this.framebuffer_!.data[addr + 3] = c.alpha;
        }
    }

    // blend an image into another one
    public blend(position: Point2D, other: Surface, size: Rect, opacity: number = 1.0, mask?: number): void {
        // "tecture" position and size
        let tx = size.x;
        let ty = size.y;
        let tw = size.w;
        let th = size.h;

        // nothing to be done if we are outside
        if ((tx > this.width_) || (ty > this.height_)) {
            return;
        }

        // clamp the texture size if it's outside our surface
        if (position.x + tw > this.width_) {
            tw = this.width_ - position.x;
        }

        if (position.y + th > this.height_) {
            th = this.height_ - position.y;
        }

        // get the dest frame buffer data
        let src_data = other.data;
        let dst_data = this.context_!.getImageData(position.x, position.y, tw, th);

        // copy the image
        for (let y = ty; y < (ty + th); y++) {
            let s_addr = y * other.width;
            let d_addr = (y - ty) * dst_data.width;

            for (let x = tx; x < (tx + tw); x++) {
                let s_off = (s_addr + x) << 2;
                let d_off = (d_addr + (x - tx)) << 2;

                // retrieve the component from the source
                let sr = src_data.data[s_off + 0];
                let sg = src_data.data[s_off + 1];
                let sb = src_data.data[s_off + 2];
                let sa = src_data.data[s_off + 3];

                // bypass this color if a mask is defined
                if ( mask !== undefined ) {
                    let v1 = RGBA.toUInt32(sr, sg, sb, 0);
                    if (v1 == mask) {
                        continue;
                    }
                }

                // compute the blending only if it's not a pure copy
                if (opacity < 1.0) {
                    // retrieve the component from the destination
                    let dr = dst_data.data[d_off + 0];
                    let dg = dst_data.data[d_off + 1];
                    let db = dst_data.data[d_off + 2];
                    let da = dst_data.data[d_off + 3];

                    // blending
                    sr = Math.floor(lerp(dr, sr, opacity));
                    sg = Math.floor(lerp(dg, sg, opacity));
                    sb = Math.floor(lerp(db, sb, opacity));
                    sa = Math.floor(lerp(da, sa, opacity));
                }

                // set the destination pixel accordingly
                dst_data.data[d_off + 0] = sr;
                dst_data.data[d_off + 1] = sg;
                dst_data.data[d_off + 2] = sb;
                dst_data.data[d_off + 3] = sa;
            }
        }

        // restore destination pixels
        this.context_!.putImageData(dst_data, position.x, position.y);
    }
}
