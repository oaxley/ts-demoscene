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

    //----- methods
    // constructor
    constructor(display: Display) {
        super('glenz', display);

        // set the vars
        this.background_ = new Surface();
        this.angle_ = 0;
        this.depth_ = 192;
        this.center_= {x: display.width >> 1, y: display.height >> 1};

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

    // update the animation
    protected update(time?: number): void {
        if (!this.isAnimated) {
            return;
        }

        // compute the projection
        this.projection(this.angle_, this.center_);

        // increment angle value
        this.angle_ = (this.angle_ + 2) % 360;
    }

    // render the animation on the screen
    protected render(time?: number): void {
        if (!this.isAnimated) {
            return;
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