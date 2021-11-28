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


//----- interfaces
// Frame Buffer interface
interface IFrameBuffer {
    data   : ArrayBuffer;           // the framebuffer data
    data8  : Uint8ClampedArray;     // 8-bit framebuffer access
    data32 : Uint32Array;           // 32-bit framebuffer access
    address: number;                // current framebuffer address
}


//----- class
export class Surface {
    //----- members
    private width_ : number = 0;            // Surface width
    private height_: number = 0;            // Surface height
    private length_: number = 0;            // Surface length

    private framebuffer_: IFrameBuffer|undefined;
    private viewport_   : Viewport;


    //----- methods
    constructor(size?: Size) {
        // set the vars
        this.viewport_ = new Viewport();

        if (size) {
            this.width_  = size.width;
            this.height_ = size.height;
            this.length_ = size.width * size.height;
            this.create(this.width_, this.height_);
        }
    }

    //----- accessors

    // width/height/size for this surface
    public get width(): number {
        return this.width_;
    }
    public get height(): number {
        return this.height_;
    }
    public get size(): Size {
        return {
            width: this.width_,
            height: this.height_
        };
    }

    // set the surface from an ImageData
    public set image(img: ImageData) {
        this.width_  = img.width;
        this.height_ = img.height;

        // create the FrameBuffer
        this.create(img.width, img.height);
        this.framebuffer_!.data8.set(img.data);
    }

    // create an imagedata from the surface
    public get image(): ImageData {
        let img = new ImageData(this.width_, this.height_);
        img.data.set(this.framebuffer_!.data8);
        return img;
    }

    // set the address directly
    public set address(value: number) {
        this.framebuffer_!.address = value << 2;
    }

    // get/set a 8-byte to the framebuffer at the current address
    public get streamB(): number {
        return this.framebuffer_!.data8[this.framebuffer_!.address++] >> 0;
    }
    public set streamB(value: number)  {
        this.framebuffer_!.data8[this.framebuffer_!.address++] = value >>> 0;
    }

    // get/set a 32-byte to the framebuffer at the current address
    public get streamW(): number {
        let value = this.framebuffer_!.data32[this.framebuffer_!.address >> 2];
        this.framebuffer_!.address += 4;
        return value >>> 0;
    }
    public set streamW(value: number) {
        this.framebuffer_!.data32[this.framebuffer_!.address >> 2] = value >>> 0;
        this.framebuffer_!.address += 4;
    }

    // read a 32-bit value from the frame-buffer without moving the address
    public get readW(): number {
        return this.framebuffer_!.data32[this.framebuffer_!.address >> 2] >>> 0;
    }

    //----- functions

    // create the frame-buffer structure
    private create(width: number, height: number): void {
        // we need to x4 because of the 8-bit array to store RGBA values
        let length = (width * height) << 2;
        let data = new ArrayBuffer(length);
        this.framebuffer_ = {
            data   : data,
            data8  : new Uint8ClampedArray(data),
            data32 : new Uint32Array(data),
            address: 0
        };
    }

    // clear the surface
    public clear(): void {
        this.framebuffer_!.data32.fill(0);
    }

    // copy from another surface
    public copy(other: Surface): void {
        this.create(other.width_, other.height_);
        this.framebuffer_!.data32.set(other.framebuffer_!.data32);
    }

    // set the frame-buffer address to a particular pixel
    public setAddrXY(x: number, y: number): void {
        this.framebuffer_!.address = (y * this.width_ + x) << 2;
    }

    // align the current frame-buffer address on a 32-bit boundary
    public alignAddr(): void {
        let address = this.framebuffer_!.address;
        this.framebuffer_!.address = (address >> 2) << 2;
    }

    // true if adress is aligned on 32-bit boundary
    public isAddrAligned(): boolean {
        return ((this.framebuffer_!.address & 3) == 0);
    }

    // set the color value for a pixel
    public setPixel(x: number, y: number, c: RGBA): void {
        this.framebuffer_!.data32[y * this.width_ + x] = c.uint32;
    }

    // get the color value for a pixel
    public getPixel(x: number, y: number): RGBA {
        let c = new RGBA();
        c.uint32 = this.framebuffer_!.data32[y * this.width_ + x];
        return c;
    }

    // get a block of data
    public getImgBlock(bx: number, by: number, bw: number, bh: number): ImageData {
        let imgdata = new ImageData(bw, bh);

        let d_off = 0;
        for (let y = by; y < (by + bh); y++) {
            let addr = y * this.width_;
            for (let x = bx; x < (bx + bw); x++) {
                let s_off = (addr + x) << 2;
                imgdata.data[d_off++] = this.framebuffer_!.data8[s_off + 0];
                imgdata.data[d_off++] = this.framebuffer_!.data8[s_off + 1];
                imgdata.data[d_off++] = this.framebuffer_!.data8[s_off + 2];
                imgdata.data[d_off++] = this.framebuffer_!.data8[s_off + 3];
            }
        }

        return imgdata;
    }

    public putImgBlock(imgdata: ImageData, bx: number, by: number): void {
        let s_off = 0;
        for (let y = by; y < (by + imgdata.height); y++) {
            let addr = y * this.width_;
            for (let x = bx; x < (bx + imgdata.width); x++) {
                let d_off = (addr + x) << 2;
                this.framebuffer_!.data8[d_off + 0] = imgdata.data[s_off++];
                this.framebuffer_!.data8[d_off + 1] = imgdata.data[s_off++];
                this.framebuffer_!.data8[d_off + 2] = imgdata.data[s_off++];
                this.framebuffer_!.data8[d_off + 3] = imgdata.data[s_off++];
            }
        }
    }

    // draw a line with the Bresenham algorithm
    public line(p1: Point2D, p2: Point2D, c: RGBA): void {
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        this.setPixel(x, y, c);

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
                this.setPixel(x, y, c);
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
                this.setPixel(x, y, c);
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
        for (let i = x1; i <= x2; i++, addr += 1) {
            this.framebuffer_!.data32[addr] = c.uint32;
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
            this.framebuffer_!.data32[addr] = c.uint32;
        }
    }

    // draw a circle (Bresenham algorithm)
    public circle(p: Point2D, r: number, c: RGBA): void {
        // helper function
        function drawCircle(self: Surface, xc: number, yc: number, x: number, y: number): void {
            self.setPixel(xc+x, yc+y, c);
            self.setPixel(xc-x, yc+y, c);
            self.setPixel(xc+x, yc-y, c);
            self.setPixel(xc-x, yc-y, c);

            self.setPixel(xc+y, yc+x, c);
            self.setPixel(xc-y, yc+x, c);
            self.setPixel(xc+y, yc-x, c);
            self.setPixel(xc-y, yc-x, c);
        }

        let x = 0, y = r;
        let d = 3 - 2 * r;
        drawCircle(this, p.x, p.y, x, y);
        while (y >= x) {
            x++;
            if (d > 0) {
                y --;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            drawCircle(this, p.x, p.y, x, y);
        }
    }


    // load an image
    public loadImage(name: string): Promise<boolean> {
        let img = new Image();

        // future promise
        let future = new Promise((resolve, reject) => {
            // image event handlers
            img.onload = event => {
                resolve(true);
            };
            img.onerror = event => {
                reject(false);
            }

            // load the image
            img.src = name;
        });

        // execute the future
        return future
            .then(result => {
                // copy the image on a temporary canvas
                let canvas    = <HTMLCanvasElement> document.createElement("canvas");
                canvas.width  = img.width;
                canvas.height = img.height;
                let context   = canvas.getContext("2d");
                context!.drawImage(img, 0, 0);

                // create the frame-buffer and copy the image
                let imgdata = context!.getImageData(0, 0, canvas.width, canvas.height);
                this.image = imgdata;

                return true;
            })
            .catch(result => {
                console.log(`Error: unable to load the image ${name}`);
                return false;
            });
    }

    /* blend an image into another one
     * Args:
     *      to     : the position where to apply the texture
     *      other  : the source surface
     *      from   : the position/size of the texture from the source surface
     *      opacity: opacity of the source texture (default: 1.0)
     *      mask   : the value of the transparent pixel if any
     */
    public blend(to: Point2D, other: Surface, from: Rect, opacity?: number, mask?: RGBA|number): void {
        // "texture" position and size
        let tx = from.x;
        let ty = from.y;
        let tw = from.w;
        let th = from.h;

        // nothing to be done if we are outside our surface
        if ((to.x < 0) || (to.x > this.width_) || (to.y < 0) || (to.y > this.height_)) {
            return;
        }

        // ensure the texture size remains inside our surface
        if (to.x + tw > this.width_) {
            tw = this.width_ - to.x;
        }
        if (to.y + th > this.height_) {
            th = this.height_ - to.y;
        }

        // copy the image
        for (let y = ty; y < (ty + th); y++) {
            // compute src / dst addresses
            let s_addr = y * other.width_;
            let d_addr = (to.y + (y - ty)) * this.width_;

            for (let x = tx; x < (tx + tw); x++) {
                // set the corresponding frame-buffer to this address
                other.address = s_addr + x;
                this.address  = d_addr + (to.x + (x - tx));

                // source pixel
                let src = other.streamW;

                // transparent pixel
                if ( (src & 0xFF000000) == 0 ) {
                    continue;
                }

                // mask is defined
                if (mask) {
                    if (src == mask) {
                        continue;
                    }
                }

                // opacity is defined
                if ((opacity !== undefined) && (opacity < 1.0)) {
                    // retrieve the destination value
                    let dst = this.readW;

                    // extract RGBA values
                    let [ sr, sg, sb, sa ] = RGBA.fromUInt32(src);
                    let [ dr, dg, db, da ] = RGBA.fromUInt32(dst);

                    // blending
                    sr = Math.floor(lerp(dr, sr, opacity));
                    sg = Math.floor(lerp(dg, sg, opacity));
                    sb = Math.floor(lerp(db, sb, opacity));
                    sa = Math.floor(lerp(da, sa, opacity));

                    // 'rebuild' the 32-bit value
                    src = RGBA.toUInt32(sr, sg, sb, sa);
                }

                this.streamW = src;
            }
        }
    }

}

