/*
 * @file    glenz.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Glenz effect in Typescript
 */

//----- imports
import { IAnimation } from "library/core/animation";
import { States } from "library/core/manager";
import { Display } from "library/core/display";
import { radians } from "library/maths/utils";
import { Point2D, Point3D } from "library/core/interfaces";
import { RGBA } from "library/color/RGBA";
import { Surface } from "library/gfx/surface";


//----- globals
const ZOOM = 256;


//----- class
export class Glenz extends IAnimation {

    //----- members
    private costable_: number[];        // pre-computed cosine table
    private sintable_: number[];        // pre-computed sine table

    private plane3D_: Point3D[];        // the 3D plane
    private plane2D_: Point2D[];        // the 3D plane projection on the 2D space

    private angle_: number;             // rotation angle
    private depth_: number;             // screen Z coordinate
    private center_: Point2D;           // screen center

    private background_: Surface;       // background image

    private xmin_: Uint16Array;         // xmin values
    private xmax_: Uint16Array;         // xmax values
    private ymin_: number;              // ymin value
    private ymax_: number;              // ymax value

    //----- methods
    // constructor
    constructor(display: Display) {
        super('glenz', display);

        // set the vars
        this.background_ = new Surface();
        this.angle_ = 0;
        this.depth_ = 192;
        this.center_= {x: display.width >> 1, y: display.height >> 1};

        this.xmin_ = new Uint16Array(this.display_.height);
        this.xmax_ = new Uint16Array(this.display_.height);
        this.ymin_ = 0;
        this.ymax_ = 0;

        // initialize the plane
        this.plane3D_ = [
            { x: 100, y:-100, z: 100 },
            { x:-100, y:-100, z: 100 },
            { x:-100, y: 100, z: 100 },
            { x: 100, y: 100, z: 100 }
        ];
        this.plane2D_ = [
            { x: 0, y: 0},
            { x: 0, y: 0},
            { x: 0, y: 0},
            { x: 0, y: 0}
        ];

        // initialize the cos/sin tables
        this.costable_ = [];
        this.sintable_ = [];
        this.createTables();
    }

    // precompute cos/sin tables
    private createTables(): void {
        for (let i = 0; i < 360; i++) {
            let angle = radians(i);
            this.costable_[i] = Math.cos(angle);
            this.sintable_[i] = Math.sin(angle);
        }
    }

    // compute the 2D projection
    private projection(angle: number, center: Point2D): void {
        // because we use the same angle for all the axis, we can optimize
        // a bit the computation
        let c = this.costable_[angle];
        let s = this.sintable_[angle];
        let ss = this.sintable_[angle] * this.sintable_[angle];

        let m00 = this.costable_[angle] * this.costable_[angle];
        let m10 = this.sintable_[angle] * this.costable_[angle];
        let m20 = -this.sintable_[angle];

        let m01 = m10 * this.sintable_[angle] - m10;
        let m11 = ss * this.sintable_[angle] + m00;
        let m21 = m10;

        let m02 = m10 * this.costable_[angle] + ss;
        let m12 = m01;
        let m22 = m00;

        let a0 = -(m01 * m00);
        let a1 = -(m11 * m10);
        let a2 = -(m21 * m20)

        for (let i = 0; i < this.plane3D_.length; i++) {
            let x = this.plane3D_[i].x;
            let y = this.plane3D_[i].y;
            let z = this.plane3D_[i].z;
            let xy = -x*y;

            let px = (m01 + x) * (m00 + y) + a0 + xy + m02*z;
            let py = (m11 + x) * (m10 + y) + a1 + xy + m12*z;
            let pz = (m21 + x) * (m20 + y) + a2 + xy + m22*z;

            this.plane2D_[i].x = (center.x) + Math.floor((px * ZOOM) / (pz + this.depth_));
            this.plane2D_[i].y = (center.y) + Math.floor((py * ZOOM) / (pz + this.depth_));
        }
    }

    // dummy function to set xmin/xmax/ymin/ymax
    private xset(x: number, y: number): void {
        if ((y < 0) || (y > this.height_)) {
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
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        this.xset(x, y);

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
                this.xset(x, y);
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
                this.xset(x, y);
            }
        }
    }

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // compute the projection
        this.projection(this.angle_, this.center_);

        // compute the xmin/xmax values to "fill" the plane
        this.xmin_.fill(this.width_);
        this.xmax_.fill(0);
        this.ymin_ = this.height_;
        this.ymax_ = 0;

        for (let i = 0; i < this.plane2D_.length; i++) {
            this.xline(this.plane2D_[i], this.plane2D_[(i+1) % 4]);
        }

        // increment angle value
        this.angle_ = (this.angle_ + 1) % 360;
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // copy the background on the surface
        this.display_.surface.copy(this.background_);

        // draw the transparent plane
        let c = new RGBA(128, 128, 128);
        for (let y = this.ymin_; y < this.ymax_; y++) {
            // nothing to do there
            if ((this.xmax_[y] == 0) || (this.xmin_[y] == this.width_)) {
                continue;
            }

            if (this.xmax_[y] == 0) {
                this.xmax_[y] = this.width_ - 1 ;
            }
            if (this.xmin_[y] == this.width_) {
                this.xmin_[y] = 0;
            }

            let p1: Point2D = {x: this.xmin_[y], y: y}
            let p2: Point2D = {x: this.xmax_[y], y: y}
            this.display_.surface.hline(p1, p2, c);
        }

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // setup function
    public setup(): void {
        // load the background image
        this.background_
            .loadImage('/images/assets/ts-glenz.asset.jpg')
            .then(result => {

                // toggle the animation
                this.toggle();

                // set the click handler to pause the animation
                window.onclick = () => {
                    this.toggle();
                }

                console.log("Starting Glenz animation.");
            });
    }

    // cleanup function
    public cleanup(): void {
    }

    // run the animation
    public run(time: number|undefined): States {

        // update & render the flames buffer
        this.update(time);
        this.render(time);

        // this animation will run indefinitely
        return States.S_RUNNING;
    }
}