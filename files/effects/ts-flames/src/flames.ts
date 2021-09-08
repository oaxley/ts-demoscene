/*
 * @file    flames.ts
 * @author  Sebastien LEGRAND
 *
 * @brief   Flames effect in Typescript
 */

//----- imports
import { Animation } from "library/core/animation";
import { Display } from "library/core/display";
import { Palette } from "library/color/palette";
import { Color } from "library/color/color";
import { RGBA } from "library/color/RGBA";
import { Point2D, Point3D } from "library/core/interfaces";


//----- globals
const WHITE_COLOR_INDEX = 255;
const BLACK_COLOR_INDEX = 0;
const WHITE_PERCENTAGE = 0.55;

const ZOOM = 256;


//----- class
export class Flames extends Animation {

    //----- members
    private display_: Display;
    private palette_: Palette;
    private flames_ : number[];
    private width_  : number;
    private height_ : number;

    private costable_: number[];            // precomputed cosinus table
    private sintable_: number[];            // precomputed sinus table

    private cube3D_: Point3D[];             // the initial cube in 3D
    private cube2D_: Point2D[];             // the cube after projecting on screen
    private angle_: number;                 // current cube angle for all axis
    private depth_: number;                 // screen depth
    private center_: Point2D;               // cube center
    private offset_: Point2D;               // offset to move the cube center


    //----- methods
    // constructor
    constructor(display: Display) {
        super();

        // set the vars
        this.display_ = display;
        this.width_   = display.width;
        this.height_  = display.height;
        this.flames_  = [];

        // create the palette
        this.createPalette();

        // initialize flames buffer
        for (let i = 0; i < this.width_ * this.height_; i++) {
            this.flames_[i] = BLACK_COLOR_INDEX;
        }

        // create the cos/sin precompute tables
        this.createTables();

        // initialize the 3D cube
        this.cube3D_ = [
            { x:-100, y:-100, z:-100 },
            { x: 100, y:-100, z:-100 },
            { x: 100, y: 100, z:-100 },
            { x:-100, y: 100, z:-100 },
            { x: 100, y:-100, z: 100 },
            { x:-100, y:-100, z: 100 },
            { x:-100, y: 100, z: 100 },
            { x: 100, y: 100, z: 100 }
        ]

        // create the initial values in the array
        this.cube2D_ = []
        for (let i = 0; i < 8; i++) {
            this.cube2D_.push({ x: 0, y: 0});
        }

        // default value for the cube
        this.angle_ = 0;
        this.depth_ = 384;
        this.center_ = { x: 320, y: 200};
        this.offset_ = { x: 2, y: 1};
    }

    // create the Fire palette
    private createPalette(): void {
        this.palette_ = new Palette();

        for (let i = 0; i < 32; i++) {
            // black to blue
            this.palette_.setColor(i, Color.from(new RGBA(0, 0, i << 1)));

            // blue to red
            this.palette_.setColor(i + 32, Color.from(new RGBA(i << 3, 0, 64 - (i << 1))));

            // red to yellow
            this.palette_.setColor(i + 64, Color.from(new RGBA(255, i << 3, 0)));

            // yellow to white
            this.palette_.setColor(i + 96, Color.from(new RGBA(255, 255, i << 2)));
            this.palette_.setColor(i + 128, Color.from(new RGBA(255, 255, 64 + (i << 2))));
            this.palette_.setColor(i + 160, Color.from(new RGBA(255, 255, 128 + (i << 2))));
            this.palette_.setColor(i + 192, Color.from(new RGBA(255, 255, 192 + i )));
            this.palette_.setColor(i + 224, Color.from(new RGBA(255, 255, 224 + i )));
        }
    }

    // generate the flames at the bottom
    private generate(): void {
        if ( !this.isAnimated ) {
            return;
        }

        for (let y = this.height_ - 2; y < this.height_; y++) {
            let offset = y * this.width_;
            for (let x = 0; x < this.width_; x+=2) {
                let color = BLACK_COLOR_INDEX;

                if ( Math.random() > WHITE_PERCENTAGE ) {
                    color = WHITE_COLOR_INDEX;
                }

                this.flames_[offset + x] = color;
                this.flames_[offset + (x+1)] = color;
            }
        }
    }

    private createTables(): void {
        this.costable_ = [];
        this.sintable_ = [];

        for (let i = 0; i < 360; i++) {
            let angle = (i * Math.PI) / 180.0;
            this.costable_[i] = Math.cos(angle);
            this.sintable_[i] = Math.sin(angle);
        }
    }

    // set a white pixel in the flame buffer
    private setPixel(x: number, y: number): void {
        if ( (x > this.width_ - 2) || (x < 2) || (y > this.height_) || (y < 0) )
            return;

        this.flames_[(y * this.width_) + x] = WHITE_COLOR_INDEX;
    }

    // compute the 2D projection of the 3D object
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

        for (let i = 0; i < 8; i++) {
            let x = this.cube3D_[i].x;
            let y = this.cube3D_[i].y;
            let z = this.cube3D_[i].z;
            let xy = -x*y;

            let px = (m01 + x) * (m00 + y) + a0 + xy + m02*z;
            let py = (m11 + x) * (m10 + y) + a1 + xy + m12*z;
            let pz = (m21 + x) * (m20 + y) + a2 + xy + m22*z;

            this.cube2D_[i].x = (center.x) + Math.floor((px * ZOOM) / (pz + this.depth_));
            this.cube2D_[i].y = (center.y) + Math.floor((py * ZOOM) / (pz + this.depth_));
        }
    }

    // trace a line in the flame buffer with the Bresenham algorithm
    private line(p1: Point2D, p2: Point2D): void {
        let incrx: number, incry: number, x: number, y: number;
        let delta: number, dx: number, dy: number;

        [ incrx, incry, x, y ] = [ 1, 1, p1.x, p1.y];
        this.setPixel(x, y);

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
                this.setPixel(x, y);
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
                this.setPixel(x, y);
            }
        }
    }

    // draw the cube
    private drawCube(): void {
        this.line(this.cube2D_[0], this.cube2D_[1]);
        this.line(this.cube2D_[1], this.cube2D_[2]);
        this.line(this.cube2D_[2], this.cube2D_[3]);
        this.line(this.cube2D_[3], this.cube2D_[0]);

        this.line(this.cube2D_[4], this.cube2D_[5]);
        this.line(this.cube2D_[5], this.cube2D_[6]);
        this.line(this.cube2D_[6], this.cube2D_[7]);
        this.line(this.cube2D_[7], this.cube2D_[4]);

        this.line(this.cube2D_[0], this.cube2D_[5]);
        this.line(this.cube2D_[1], this.cube2D_[4]);
        this.line(this.cube2D_[2], this.cube2D_[7]);
        this.line(this.cube2D_[3], this.cube2D_[6]);
    }

    // run the animation
    public run(): void{
        console.log("Starting Flames animation.");

        // toggle the animation
        this.toggle();

        // generate the data
        this.generate();

        // run the animation on the next frame
        requestAnimationFrame(this.main.bind(this));
    }

    // update the animation
    protected update(timestamp: number): void{
        if (!this.isAnimated)
            return;

        // move the center of the cube
        this.center_.x += this.offset_.x;
        this.center_.y += this.offset_.y;

        if ((this.center_.x < (this.width_ * 0.20)) || (this.center_.x > (this.width_ * 0.80))) {
            this.offset_.x *= -1;
        }

        if ((this.center_.y < (this.height_ * 0.20)) || (this.center_.y > (this.height_ * 0.70))) {
            this.offset_.y *= -1;
        }

        // compute the projection of the cube
        this.projection(this.angle_, this.center_);

        // we draw the cube only every 3 frames to allow time for "burning"
        if( (this.frames_ % 3) == 0 ) {
            this.drawCube();
        }

        // increment angle value
        this.angle_ += 2;
        if ( this.angle_ > 360 )
            this.angle_ = 0;

        // create the flame effect
        for (let y = 1; y < this.height_ - 1; y++) {
            let offset = y * this.width_;
            for (let x = 1; x < this.width_ - 1; x++) {
                let value = 0;
                value += this.flames_[offset - this.width_ + x];
                value += this.flames_[offset + x - 1];
                value += this.flames_[offset + x + 1];
                value += this.flames_[offset + this.width_ + x];

                // artificially reduce the flames
                value = value - 3;
                value = (value < 0) ? 0 : value;

                // store the new value above the current pixel
                this.flames_[offset - this.width_ + x] = value >> 2;
            }
        }
    }

    // render the animation on the screen
    protected render(timestamp: number): void{
        if (!this.isAnimated)
            return;

        // retrieve the backbuffer image data
        let img_data = this.display_.surface.data;

        // copy the flames
        for (let y = 0; y < this.height_; y++) {
            let offset = y * this.width_;
            for (let x = 0; x < this.width_; x++) {

                // retrieve rgba components
                let index = this.flames_[offset + x];
                let rgba  = this.palette_.getColor(index).color.values;

                // set the corresponding pixel in the buffer
                let position = (offset + x)  << 2;
                img_data.data[position + 0] = rgba.x;
                img_data.data[position + 1] = rgba.y;
                img_data.data[position + 2] = rgba.z;
                img_data.data[position + 3] = rgba.a;
            }
        }

        // put back the image data on the backbuffer
        this.display_.surface.data = img_data;

        // flip the back-buffer onto the screen
        this.display_.draw();

        // increment the number of frames
        this.frames_++;
    }

    // animation main function
    protected main(timestamp: number): void{
        this.update(timestamp);
        this.render(timestamp);

        // generate the bottom line again
        this.generate();

        requestAnimationFrame(this.main.bind(this));
    }
}