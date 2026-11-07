/*
 * @file    surface.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   A drawing surface
 */

//----- imports
import { RGBA } from "library/color/RGBA";
import { Size, Rect, Point2D } from "library/core/interfaces";
import { lerp } from "library/maths/utils";
import { bresenham } from "./bresenham";

//----- enums
// enums for Clipping algorithm
enum Region {
    inside = 0,
    left = 1,
    right = 2,
    bottom = 4,
    top = 8,
}

//----- interfaces
// Frame Buffer interface
interface IFrameBuffer {
    data: ArrayBuffer; // the framebuffer data
    data8: Uint8ClampedArray<ArrayBuffer>; // 8-bit framebuffer access
    data32: Uint32Array<ArrayBuffer>; // 32-bit framebuffer access
    address: number; // current framebuffer address
    image?: ImageData; // ImageData sharing the framebuffer (lazily created)
}

//----- class
export class Surface {
    //----- members
    private width_: number = 0; // Surface width
    private height_: number = 0; // Surface height
    private length_: number = 0; // Surface length

    private framebuffer_: IFrameBuffer | undefined;

    //----- methods
    constructor(size?: Size) {
        if (size) {
            this.create(size.width, size.height);
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
            height: this.height_,
        };
    }

    // set the surface from an ImageData (the pixels are copied)
    public set image(img: ImageData) {
        this.create(img.width, img.height);
        this.framebuffer_!.data8.set(img.data);
    }

    // create an imagedata from the surface (the pixels are copied)
    public get image(): ImageData {
        let img = new ImageData(this.width_, this.height_);
        img.data.set(this.framebuffer_!.data8);
        return img;
    }

    /* ImageData sharing the surface framebuffer (no copy)
     *
     * Any change on the surface is visible in this ImageData (and vice versa).
     * The object remains valid until the surface is resized.
     */
    public get imageData(): ImageData {
        let fb = this.framebuffer_!;
        if (fb.image === undefined) {
            fb.image = new ImageData(fb.data8, this.width_, this.height_);
        }
        return fb.image;
    }

    // direct access to the framebuffer (8-bit RGBA components / 32-bit pixels)
    public get data8(): Uint8ClampedArray<ArrayBuffer> {
        return this.framebuffer_!.data8;
    }
    public get data32(): Uint32Array<ArrayBuffer> {
        return this.framebuffer_!.data32;
    }

    // set the address directly
    public set address(value: number) {
        this.framebuffer_!.address = value << 2;
    }

    // get/set a 8-byte to the framebuffer at the current address
    public get streamB(): number {
        return this.framebuffer_!.data8[this.framebuffer_!.address++] >> 0;
    }
    public set streamB(value: number) {
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

    // create the frame-buffer structure (reused when the size doesn't change)
    private create(width: number, height: number): void {
        this.width_ = width;
        this.height_ = height;
        this.length_ = width * height;

        if (this.framebuffer_ && this.framebuffer_.data32.length == this.length_) {
            this.framebuffer_.address = 0;
            if (this.framebuffer_.image && this.framebuffer_.image.width != width) {
                this.framebuffer_.image = undefined;
            }
            return;
        }

        // we need to x4 because of the 8-bit array to store RGBA values
        let length = (width * height) << 2;
        let data = new ArrayBuffer(length);
        this.framebuffer_ = {
            data: data,
            data8: new Uint8ClampedArray(data),
            data32: new Uint32Array(data),
            address: 0,
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
        return (this.framebuffer_!.address & 3) == 0;
    }

    // set the color value for a pixel
    // (pixels outside of the surface are ignored)
    public setPixel(x: number, y: number, c: RGBA): void {
        if (x < 0 || x >= this.width_ || y < 0 || y >= this.height_) {
            return;
        }
        this.framebuffer_!.data32[y * this.width_ + x] = c.uint32;
    }

    // get the color value for a pixel
    public getPixel(x: number, y: number): RGBA {
        let c = new RGBA();
        c.uint32 = this.framebuffer_!.data32[y * this.width_ + x];
        return c;
    }

    /* read a block of pixels into a 32-bit array (bw * bh values)
     *
     * The block is clipped to the surface: pixels outside of it are read as 0.
     */
    public readBlock(bx: number, by: number, bw: number, bh: number, out: Uint32Array): void {
        const src = this.framebuffer_!.data32;

        let d_off = 0;
        for (let y = by; y < by + bh; y++, d_off += bw) {
            let addr = y * this.width_ + bx;

            // fast path: the whole row is inside the framebuffer
            if (Number.isInteger(addr) && y >= 0 && y < this.height_ && bx >= 0 && bx + bw <= this.width_) {
                out.set(src.subarray(addr, addr + bw), d_off);
                continue;
            }

            for (let x = 0; x < bw; x++) {
                let px = bx + x;
                let inside = y >= 0 && y < this.height_ && px >= 0 && px < this.width_;
                out[d_off + x] = inside ? src[(y * this.width_ + px) | 0] : 0;
            }
        }
    }

    /* write a block of pixels from a 32-bit array (bw * bh values)
     *
     * The block is clipped to the surface: pixels outside of it are ignored.
     */
    public writeBlock(data: Uint32Array, bx: number, by: number, bw: number, bh: number): void {
        const dst = this.framebuffer_!.data32;

        let s_off = 0;
        for (let y = by; y < by + bh; y++, s_off += bw) {
            let addr = y * this.width_ + bx;

            // fast path: the whole row is inside the framebuffer
            if (Number.isInteger(addr) && y >= 0 && y < this.height_ && bx >= 0 && bx + bw <= this.width_) {
                dst.set(data.subarray(s_off, s_off + bw), addr);
                continue;
            }

            for (let x = 0; x < bw; x++) {
                let px = bx + x;
                if (y >= 0 && y < this.height_ && px >= 0 && px < this.width_) {
                    dst[(y * this.width_ + px) | 0] = data[s_off + x];
                }
            }
        }
    }

    // get a block of data (see readBlock)
    public getImgBlock(bx: number, by: number, bw: number, bh: number): ImageData {
        let imgdata = new ImageData(bw, bh);
        this.readBlock(bx, by, bw, bh, new Uint32Array(imgdata.data.buffer, imgdata.data.byteOffset, bw * bh));
        return imgdata;
    }

    // put a block of data (see writeBlock)
    public putImgBlock(imgdata: ImageData, bx: number, by: number): void {
        let bw = imgdata.width;
        let bh = imgdata.height;
        this.writeBlock(new Uint32Array(imgdata.data.buffer, imgdata.data.byteOffset, bw * bh), bx, by, bw, bh);
    }

    // draw a line with the Bresenham algorithm
    public line(p1: Point2D, p2: Point2D, c: RGBA): void {
        const value = c.uint32;
        const data32 = this.framebuffer_!.data32;
        const w = this.width_;
        const h = this.height_;

        // pixels outside of the surface are ignored (they used to wrap on
        // the previous / next line)
        bresenham(p1, p2, (x, y) => {
            if (x >= 0 && x < w && y >= 0 && y < h) {
                data32[y * w + x] = value;
            }
        });
    }

    // optimized algorithm for horizontal line
    public hline(p1: Point2D, p2: Point2D, c: RGBA): void {
        let x1 = p1.x;
        let x2 = p2.x;

        // swap both values if needed
        if (x1 > x2) {
            [x1, x2] = [x2, x1];
        }

        const value = c.uint32;
        const data32 = this.framebuffer_!.data32;
        let addr = p1.y * this.width_ + x1;
        for (let i = x1; i <= x2; i++, addr += 1) {
            data32[addr] = value;
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

        const value = c.uint32;
        const data32 = this.framebuffer_!.data32;
        let addr = y1 * this.width_ + p1.x;
        for (let i = y1; i <= y2; i++, addr += this.width_) {
            data32[addr] = value;
        }
    }

    // draw a circle (Bresenham algorithm)
    public circle(p: Point2D, r: number, c: RGBA): void {
        // helper function
        function drawCircle(self: Surface, xc: number, yc: number, x: number, y: number): void {
            self.setPixel(xc + x, yc + y, c);
            self.setPixel(xc - x, yc + y, c);
            self.setPixel(xc + x, yc - y, c);
            self.setPixel(xc - x, yc - y, c);

            self.setPixel(xc + y, yc + x, c);
            self.setPixel(xc - y, yc + x, c);
            self.setPixel(xc + y, yc - x, c);
            self.setPixel(xc - y, yc - x, c);
        }

        let x = 0,
            y = r;
        let d = 3 - 2 * r;
        drawCircle(this, p.x, p.y, x, y);
        while (y >= x) {
            x++;
            if (d > 0) {
                y--;
                d = d + 4 * (x - y) + 10;
            } else {
                d = d + 4 * x + 6;
            }
            drawCircle(this, p.x, p.y, x, y);
        }
    }

    // compute the outcode clipping region
    private outCode(x: number, y: number): Region {
        let code: Region = Region.inside;

        if (x < 0) {
            code |= Region.left;
        }
        if (x >= this.width_) {
            code |= Region.right;
        }
        if (y < 0) {
            code |= Region.top;
        }
        if (y >= this.height_) {
            code |= Region.bottom;
        }

        return code;
    }

    // compute the intersection of the line with the clipping rectangle
    private intersection(p0: Point2D, p1: Point2D, outcode: Region): Point2D {
        let x: number = 0;
        let y: number = 0;

        let dx = p1.x - p0.x;
        let dy = p1.y - p0.y;

        if (outcode & Region.top) {
            y = 0;
            x = p0.x + (dx * (y - p0.y)) / dy;
        } else if (outcode & Region.bottom) {
            y = this.height_ - 1;
            x = p0.x + (dx * (y - p0.y)) / dy;
        } else if (outcode & Region.left) {
            x = 0;
            y = p0.y + (dy * (x - p0.x)) / dx;
        } else if (outcode & Region.right) {
            x = this.width - 1;
            y = p0.y + (dy * (x - p0.x)) / dx;
        }

        return { x: Math.floor(x), y: Math.floor(y) };
    }

    // Cohen-Sutherland clipping algorithm
    public clipping(p0: Point2D, p1: Point2D): Point2D[] {
        let outcode0 = this.outCode(p0.x, p0.y);
        let outcode1 = this.outCode(p1.x, p1.y);
        let accept = false;

        while (true) {
            // both point are inside the window
            if ((outcode0 | outcode1) == Region.inside) {
                accept = true;
                break;
            } else if (outcode0 & outcode1) {
                // both point are outside the window
                break;
            } else {
                let outcode = outcode1 > outcode0 ? outcode1 : outcode0;
                let p: Point2D = this.intersection(p0, p1, outcode);

                if (outcode == outcode0) {
                    p0 = p;
                    outcode0 = this.outCode(p0.x, p0.y);
                } else {
                    p1 = p;
                    outcode1 = this.outCode(p1.x, p1.y);
                }
            }
        }

        if (accept) {
            return [p0, p1];
        } else {
            return [];
        }
    }

    // load an image
    public loadImage(name: string): Promise<boolean> {
        let img = new Image();

        // future promise
        let future = new Promise((resolve, reject) => {
            // image event handlers
            img.onload = () => {
                resolve(true);
            };
            img.onerror = () => {
                reject(false);
            };

            // load the image
            img.src = name;
        });

        // execute the future
        return future
            .then(() => {
                // copy the image on a temporary canvas
                let canvas = <HTMLCanvasElement>document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                let context = canvas.getContext("2d");
                context!.drawImage(img, 0, 0);

                // create the frame-buffer and copy the image
                let imgdata = context!.getImageData(0, 0, canvas.width, canvas.height);
                this.image = imgdata;

                return true;
            })
            .catch(() => {
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
    public blend(to: Point2D, other: Surface, from?: Rect, opacity?: number, mask?: RGBA | number): void {
        // "texture" position and size
        let tx: number, ty: number, tw: number, th: number;

        if (from === undefined) {
            [tx, ty, tw, th] = [0, 0, other.width, other.height];
        } else {
            [tx, ty, tw, th] = [from.x, from.y, from.w, from.h];
        }

        // nothing to be done if we are outside our surface
        if (to.x < 0 || to.x > this.width_ || to.y < 0 || to.y > this.height_) {
            return;
        }

        // ensure the texture size remains inside our surface
        if (to.x + tw > this.width_) {
            tw = this.width_ - to.x;
        }
        if (to.y + th > this.height_) {
            th = this.height_ - to.y;
        }

        const src = other.framebuffer_!.data32;
        const dst = this.framebuffer_!.data32;
        const blending = opacity !== undefined && opacity < 1.0;
        const maskValue = mask === undefined ? undefined : mask instanceof RGBA ? mask.uint32 : mask >>> 0;

        // copy the image
        for (let y = ty; y < ty + th; y++) {
            // compute src / dst addresses
            let s_addr = y * other.width_;
            let d_addr = (to.y + (y - ty)) * this.width_;

            for (let x = tx; x < tx + tw; x++) {
                // frame-buffer indexes (same truncation as the address accessors)
                let s_idx = ((s_addr + x) << 2) >> 2;
                let d_idx = ((d_addr + (to.x + (x - tx))) << 2) >> 2;

                // source pixel (0 when outside of the source)
                let value = src[s_idx] >>> 0;

                // transparent pixel
                if ((value & 0xff000000) == 0) {
                    continue;
                }

                // mask is defined
                if (maskValue !== undefined) {
                    if (value == maskValue) {
                        continue;
                    }
                }

                // opacity is defined
                if (blending) {
                    // retrieve the destination value
                    let dval = dst[d_idx] >>> 0;

                    // extract RGBA values (same as RGBA.fromUInt32)
                    let sr = value & 0xff,
                        sg = (value & 0xff00) >> 8,
                        sb = (value & 0xff0000) >> 16,
                        sa = value >>> 24;
                    let dr = dval & 0xff,
                        dg = (dval & 0xff00) >> 8,
                        db = (dval & 0xff0000) >> 16,
                        da = dval >>> 24;

                    // blending
                    sr = Math.floor(lerp(dr, sr, opacity!));
                    sg = Math.floor(lerp(dg, sg, opacity!));
                    sb = Math.floor(lerp(db, sb, opacity!));
                    sa = Math.floor(lerp(da, sa, opacity!));

                    // 'rebuild' the 32-bit value
                    value = RGBA.toUInt32(sr, sg, sb, sa);
                }

                dst[d_idx] = value;
            }
        }
    }
}
