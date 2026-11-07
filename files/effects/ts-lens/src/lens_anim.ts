/*
 * @file    lens_anim.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Lens Animation Class
 */

//----- imports
import { RGBA } from "library/color/RGBA";
import { Surface } from "library/gfx/surface";

//----- class
export class LensAnimation {
    //----- members
    // private context_ : CanvasRenderingContext2D;
    private surface_: Surface; // the drawing surface
    private transMap_: Int32Array; // deformation map
    private src_: Uint32Array; // source pixels (scratch)
    private dst_: Uint32Array; // transformed pixels (scratch)
    private zoom_: number; // lens magnification
    private radius_: number; // lens radius
    private diameter_: number; // lens diameter

    //----- methods
    // constructor(ctx: CanvasRenderingContext2D, radius: number, zoom: number) {
    constructor(surface: Surface, radius: number, zoom: number) {
        // set the vars
        this.surface_ = surface;
        this.radius_ = radius;
        this.diameter_ = radius * 2;
        this.zoom_ = zoom;
        this.transMap_ = new Int32Array(this.diameter_ * this.diameter_);
        this.src_ = new Uint32Array(this.diameter_ * this.diameter_);
        this.dst_ = new Uint32Array(this.diameter_ * this.diameter_);

        // compute the transformation map
        this.transMap();
    }

    // transformation map
    private transMap(): void {
        // temporary vars
        let d = this.diameter_;
        let r = this.radius_;
        let r2 = r * r;
        let s = Math.sqrt(r2 - this.zoom_ * this.zoom_);
        let s2 = s * s;

        // compute the map
        for (let y = -r; y < r; y++) {
            let y2 = y * y;

            for (let x = -r; x < r; x++) {
                let x2 = x * x;
                let a = x;
                let b = y;

                // point inside the circle gets magnified
                if (x2 + y2 < s2) {
                    let z = Math.sqrt(r2 - x2 - y2);
                    a = Math.floor((x * this.zoom_) / (z + 0.5));
                    b = Math.floor((y * this.zoom_) / (z + 0.5));
                }

                // transformation map
                this.transMap_[(y + r) * d + (x + r)] = (b + r) * d + (a + r);
            }
        }
    }

    // compute the lens effect at a certain position
    public compute(xc: number, yc: number): void {
        // temporary vars
        let d = this.diameter_;

        // ensure values are uint32
        xc = xc >>> 0;
        yc = yc >>> 0;

        // retrieve the upper corner of the lens
        let xl = xc - this.radius_;
        let yl = yc - this.radius_;

        // retrieve the current pixels
        const src = this.src_;
        const dst = this.dst_;
        const map = this.transMap_;
        this.surface_.readBlock(xl, yl, d, d, src);

        // go through all the pixels in the source data
        for (let i = 0; i < dst.length; i++) {
            dst[i] = src[map[i]];
        }

        // apply the transformation
        this.surface_.writeBlock(dst, xl, yl, d, d);

        // create the buble effect
        let c = new RGBA(224, 224, 224);
        this.surface_.circle({ x: xc, y: yc }, Math.floor(this.radius_), c);
    }
}
