/*
 * @file    glenz.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Glenz effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { Display } from "library/core/display";
import { lerp } from "library/maths/utils";
import { bresenham } from "library/gfx/bresenham";
import { TrigTables, projectSameAngle } from "library/maths/projection";
import { Point2D, Point3D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";
import { Surface } from "library/gfx/surface";

//----- globals
const ZOOM = 256;
const TRANPARENCY = 0.5;

//----- class
export class Glenz extends IAnimation {
    //----- members
    private tables_: TrigTables; // pre-computed cosine/sine tables

    private plane3D_: Point3D[]; // the 3D plane
    private plane2D_: Point2D[]; // the 3D plane projection on the 2D space

    private angle_: number; // rotation angle
    private depth_: number; // screen Z coordinate
    private center_: Point2D; // screen center

    private background_: Surface; // background image

    private xmin_: Uint16Array; // xmin values
    private xmax_: Uint16Array; // xmax values
    private ymin_: number; // ymin value
    private ymax_: number; // ymax value

    //----- methods
    // constructor
    constructor(display: Display) {
        super("glenz", display);

        // set the vars
        this.background_ = new Surface();
        this.angle_ = 0;
        this.depth_ = 192;
        this.center_ = { x: display.width >> 1, y: display.height >> 1 };

        this.xmin_ = new Uint16Array(this.display_.height);
        this.xmax_ = new Uint16Array(this.display_.height);
        this.ymin_ = 0;
        this.ymax_ = 0;

        // initialize the plane
        this.plane3D_ = [
            { x: 100, y: -100, z: 100 },
            { x: -100, y: -100, z: 100 },
            { x: -100, y: 100, z: 100 },
            { x: 100, y: 100, z: 100 },
        ];
        this.plane2D_ = [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
        ];

        // initialize the cos/sin tables
        this.tables_ = new TrigTables();
    }

    // compute the 2D projection
    private projection(angle: number, center: Point2D): void {
        projectSameAngle(
            this.plane3D_,
            this.plane2D_,
            this.tables_.cos[angle],
            this.tables_.sin[angle],
            center,
            this.depth_,
            ZOOM,
        );
    }

    // dummy function to set xmin/xmax/ymin/ymax
    private xset(x: number, y: number): void {
        if (y < 0 || y > this.height_) {
            return;
        }

        if (y < this.ymin_) {
            this.ymin_ = y;
        }

        if (y > this.ymax_) {
            this.ymax_ = y;
        }

        if (x < 0) {
            x = 0;
        }

        if (x > this.width_) {
            x = this.width_;
        }

        if (x < this.xmin_[y]) {
            this.xmin_[y] = x;
        }

        if (x > this.xmax_[y]) {
            this.xmax_[y] = x;
        }
    }

    // function to compute xmin/xmax values
    private xline(p1: Point2D, p2: Point2D): void {
        bresenham(p1, p2, (x, y) => this.xset(x, y));
    }

    // load the assets
    protected init(): Promise<unknown> {
        return this.background_.loadImage("/images/assets/ts-glenz.background.jpg");
    }

    // update the animation
    protected update(): void {
        // compute the projection
        this.projection(this.angle_, this.center_);

        // compute the xmin/xmax values to "fill" the plane
        this.xmin_.fill(this.width_);
        this.xmax_.fill(0);
        this.ymin_ = this.height_;
        this.ymax_ = 0;

        for (let i = 0; i < this.plane2D_.length; i++) {
            this.xline(this.plane2D_[i], this.plane2D_[(i + 1) % 4]);
        }

        // increment angle value
        this.angle_ = (this.angle_ + 1) % 360;
    }

    // render the animation on the screen
    protected render(): void {
        // copy the background on the surface
        let s = this.display_.surface;
        s.copy(this.background_);

        // draw the transparent plane
        let c = new RGBA(0, 128, 192);
        const [cr, cg, cb] = [c.red, c.green, c.blue];
        const data32 = s.data32;
        for (let y = this.ymin_; y < this.ymax_; y++) {
            // nothing to do there
            if (this.xmax_[y] == 0 || this.xmin_[y] == this.width_) {
                continue;
            }

            if (this.xmax_[y] == 0) {
                this.xmax_[y] = this.width_ - 1;
            }
            if (this.xmin_[y] == this.width_) {
                this.xmin_[y] = 0;
            }

            // blend the plane and the background color
            // (components are truncated like RGBA.uint32 does)
            let addr = y * this.width_;
            for (let x = this.xmin_[y]; x < this.xmax_[y]; x++) {
                let v = data32[addr + x];

                let r = lerp(cr, v & 0xff, TRANPARENCY) & 0xff;
                let g = lerp(cg, (v >> 8) & 0xff, TRANPARENCY) & 0xff;
                let b = lerp(cb, (v >> 16) & 0xff, TRANPARENCY) & 0xff;

                data32[addr + x] = 0xff000000 | (b << 16) | (g << 8) | r;
            }
        }

        // flip the back-buffer onto the screen
        this.display_.draw();
    }
}
