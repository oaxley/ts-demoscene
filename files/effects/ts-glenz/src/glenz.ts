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
    private tables_: TrigTables;        // pre-computed cosine/sine tables

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
        this.tables_ = new TrigTables();
    }


    // compute the 2D projection
    private projection(angle: number, center: Point2D): void {
        projectSameAngle(this.plane3D_, this.plane2D_, this.tables_.cos[angle], this.tables_.sin[angle],
                         center, this.depth_, ZOOM);
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
        bresenham(p1, p2, (x, y) => this.xset(x, y));
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
        let s = this.display_.surface;
        s.copy(this.background_);

        // draw the transparent plane
        let c = new RGBA(0, 128, 192);
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

            // blend the plane and the background color
            for (let x = this.xmin_[y]; x < this.xmax_[y]; x++) {
                let c2 = this.display_.surface.getPixel(x, y);

                let r = lerp(c.red, c2.red, TRANPARENCY);
                let g = lerp(c.green, c2.green, TRANPARENCY);
                let b = lerp(c.blue, c2.blue, TRANPARENCY);

                let c3 = new RGBA(r, g, b);
                this.display_.surface.setPixel(x, y, c3);
            }
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
            .loadImage('/images/assets/ts-glenz.background.jpg')
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